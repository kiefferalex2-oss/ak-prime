import datetime as dt
import importlib.util
import os
from pathlib import Path
import smtplib
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parents[2] / 'tools/prospection'))
spec = importlib.util.spec_from_file_location('agent', Path(__file__).parents[2] / 'tools/prospection/agent.py')
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)


def lead(**changes):
    value = dict(id='test-id', name='Club de handball exemple', buyer_role='sports_club', kind='club', source_verified=True,
                 source_url='https://example.org/besoin', contact_url='https://example.org/contact',
                 opportunity_date=agent.now().date().isoformat(), evidence='Nous recherchons un préparateur physique à distance.',
                 email='test@example.org', subject='Votre recherche de préparation physique',
                 body='Bonjour, pouvons-nous échanger sur votre besoin de préparation physique à distance ?',
                 professional_relevance='Préparation physique des équipes du club.',
                 approved=True, consent=False, consent_note='', stage='ready',
                 message_id='<test@akprime.fr>', attempted_at=agent.now().isoformat())
    return {**value, **changes}


class EligibilityTests(unittest.TestCase):
    def test_club_with_review_is_eligible(self):
        self.assertTrue(agent.eligible(lead()))

    def test_public_address_is_not_individual_consent(self):
        self.assertFalse(agent.eligible(lead(kind='individual')))
        self.assertFalse(agent.eligible(lead(kind='individual', consent=True)))
        self.assertTrue(agent.eligible(lead(kind='individual', consent=True, consent_note='Accord explicite reçu le 11 novembre.')))

    def test_blocks_old_future_unverified_unapproved_or_processed(self):
        for changes in [dict(approved=False), dict(source_verified=False), dict(stage='opted_out'),
                        dict(stage='replied'), dict(stage='uncertain'), dict(email='a@b.org\nBcc:x@y.org'),
                        dict(professional_relevance=''), dict(opportunity_date='2020-01-01'),
                        dict(opportunity_date='2099-01-01')]:
            with self.subTest(changes=changes):
                self.assertFalse(agent.eligible(lead(**changes)))

    def test_candidate_requires_real_citation_and_recent_date(self):
        candidate=lead()
        citations={candidate['source_url']}
        self.assertTrue(agent.validate_candidate(candidate,citations))
        self.assertFalse(agent.validate_candidate(candidate,set()))
        self.assertFalse(agent.validate_candidate({**candidate,'evidence':'trop court'},citations))
        self.assertFalse(agent.validate_candidate({**candidate,'subject':'Hello\nBcc: foo'},citations))
        self.assertFalse(agent.validate_candidate({**candidate,'opportunity_date':'2020-01-01'},citations))

    def test_competitors_are_not_buyers(self):
        for name in ['My Day Sport Santé', 'SPORACTIO Maison Sport Santé', 'Coaching Performance', 'Fitness Club']:
            with self.subTest(name=name):
                self.assertFalse(agent.is_target_buyer(lead(name=name)))
        self.assertFalse(agent.is_target_buyer(lead(buyer_role='provider')))
        self.assertFalse(agent.is_target_buyer(lead(name='Entreprise exemple', buyer_role='employer_cse', evidence='Votre bien-être est notre priorité.')))
        self.assertTrue(agent.is_target_buyer(lead()))
        self.assertTrue(agent.is_target_buyer(lead(name='CSE Entreprise exemple', buyer_role='employer_cse', evidence='Notre CSE accompagne les salariés de notre entreprise.')))

    def test_recency_boundaries(self):
        at=dt.datetime(2026,11,11,tzinfo=agent.UTC)
        for value,expected in [('2026-10-12',True),('2026-10-11',False),('2026-11-12',False),('bad',False)]:
            self.assertEqual(agent.recent(value,at),expected)

    def test_source_url_rejects_internal_hosts_credentials_and_ports(self):
        for url in ['http://example.org','https://user:pass@example.org','https://example.org:8080']:
            with self.assertRaises(ValueError):agent.public_url(url)
        with patch.object(agent.socket,'getaddrinfo',return_value=[(2,1,6,'',('127.0.0.1',443))]):
            with self.assertRaises(ValueError):agent.public_url('https://example.org')


class MailTests(unittest.TestCase):
    def test_identity_reply_and_opt_out(self):
        msg=agent.make_message(lead(),'<test@akprime.fr>')
        self.assertEqual(msg['To'],'test@example.org')
        self.assertEqual(msg['Reply-To'],agent.SENDER)
        self.assertIn('STOP',msg.get_content())
        self.assertIn('https://example.org/contact',msg.get_content())
        self.assertIn('?legal=privacy',msg.get_content())

    def test_header_injection_rejected(self):
        with self.assertRaises(ValueError):agent.make_message(lead(subject='test\nBcc: x@y.org'),'<id>')

    def test_smtp_ambiguity_does_not_retry(self):
        db=MagicMock()
        db.settings.return_value={'enabled':True,'sending_enabled':True}
        db.rpc.side_effect=[[lead(stage='sending',opportunity_date='2026-11-11')],[]]
        conn=MagicMock()
        conn.__enter__.return_value=conn
        conn.send_message.side_effect=smtplib.SMTPServerDisconnected('uncertain')
        at=dt.datetime(2026,11,11,11,tzinfo=agent.UTC)
        with patch.object(agent,'now',return_value=at),patch.object(agent.smtplib,'SMTP_SSL',return_value=conn):
            with self.assertRaises(RuntimeError):agent.send_pending(db,'fake-secret')
        conn.send_message.assert_called_once()
        self.assertEqual(db.call.call_args.args[2]['stage'],'uncertain')

    def test_paused_and_outside_window_never_connect(self):
        db=MagicMock()
        for enabled,at in [(False,dt.datetime(2026,11,11,11,tzinfo=agent.UTC)),
                           (True,dt.datetime(2026,11,15,11,tzinfo=agent.UTC)),
                           (True,dt.datetime(2026,11,11,21,tzinfo=agent.UTC))]:
            db.settings.return_value={'enabled':enabled,'sending_enabled':True}
            with patch.object(agent,'now',return_value=at),patch.object(agent.smtplib,'SMTP_SSL') as smtp:
                self.assertEqual(agent.send_pending(db,'fake'),0)
                smtp.assert_not_called()

    def test_inbox_failure_blocks_sending_but_not_independent_research(self):
        db=MagicMock();db.settings.return_value={'enabled':True,'research_enabled':True};db.metrics=dict(checked=0,candidates=0,added=0,verified=0,sent=0);db.call.return_value=[]
        with patch.object(agent,'Database',return_value=db),patch.object(sys,'argv',['agent','--mode','run']),\
             patch.dict(os.environ,{'PROSPECTION_OVH_PASSWORD':'fake'}),\
             patch.object(agent,'sync_replies',side_effect=OSError('offline')),\
             patch.object(agent,'discover') as research,patch.object(agent,'send_pending') as send:
            research.return_value=0
            with self.assertRaises(SystemExit):agent.main()
            research.assert_called_once();send.assert_not_called()

    def test_independent_stop_stops_contact(self):
        db=MagicMock();db.call.return_value=[lead(stage='sent')]
        conn=MagicMock();conn.__enter__.return_value=conn
        conn.select.return_value=('OK',[])
        raw=b'From: test@example.org\r\nSubject: STOP\r\nDate: Wed, 11 Nov 2026 15:00:00 +0000\r\n\r\n'
        conn.uid.side_effect=[('OK',[b'42']),('OK',[(b'42',raw)])]
        record=lead(stage='sent',attempted_at='2026-11-11T12:00:00+00:00')
        db.call.return_value=[record]
        with patch.object(agent.imaplib,'IMAP4_SSL',return_value=conn):agent.sync_replies(db,'fake')
        self.assertEqual(db.call.call_args.args[2]['stage'],'opted_out')
        conn.select.assert_called_once_with('INBOX',readonly=True)

    def test_inbox_fetch_failure_stops_processing(self):
        db=MagicMock();db.call.return_value=[]
        conn=MagicMock();conn.__enter__.return_value=conn;conn.select.return_value=('OK',[])
        conn.uid.side_effect=[('OK',[b'42']),('NO',[])]
        with patch.object(agent.imaplib,'IMAP4_SSL',return_value=conn):
            with self.assertRaises(RuntimeError):agent.sync_replies(db,'fake')


if __name__=='__main__':unittest.main()
