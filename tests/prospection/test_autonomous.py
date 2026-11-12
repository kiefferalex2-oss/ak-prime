import datetime as dt
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import MagicMock
sys.path.insert(0,str(Path(__file__).parents[2]/'tools/prospection'))
spec=importlib.util.spec_from_file_location('autonomous_agent',Path(__file__).parents[2]/'tools/prospection/agent.py')
agent=importlib.util.module_from_spec(spec);spec.loader.exec_module(agent)

def buyer(**changes):
    row=dict(id='test',name='Club de handball exemple',kind='club',buyer_role='sports_club',
        source_url='https://example.org/',contact_url='https://www.example.org/contact',
        email='contact@example.org',opportunity_date=agent.now().date().isoformat(),
        evidence='Notre club de handball accueille des équipes adultes.',professional_relevance='Préparation des équipes adultes.',
        source_verified=True,subject='Objet',body='Une proposition de préparation physique à distance adaptée au club.',
        consent=False,consent_note='',approved=False,stage='new',message_id=None)
    return {**row,**changes}

class AutonomousTests(unittest.TestCase):
    def test_only_verified_buyers_can_be_automatic(self):
        self.assertTrue(agent.autonomous_candidate(buyer()))
        for changes in [dict(kind='individual',consent=True),dict(name='Maison Sport Santé'),dict(source_verified=False),
                        dict(buyer_role=''),dict(stage='opted_out'),dict(message_id='<already>'),
                        dict(opportunity_date='2020-01-01'),dict(contact_url='https://other.org/contact'),
                        dict(source_url='https://facebook.com/club',contact_url='https://facebook.com/contact')]:
            with self.subTest(changes=changes):self.assertFalse(agent.autonomous_candidate(buyer(**changes)))

    def test_autonomous_authority_is_not_owner_approval(self):
        row=buyer(stage='ready',autonomous_authorized_at='2026-11-12T12:00:00Z')
        row['autonomous_snapshot']=agent.email_snapshot(row)
        self.assertFalse(row['approved']);self.assertTrue(agent.eligible(row))
        row['body']+=' Changed after authorization.'
        self.assertFalse(agent.eligible(row))

    def test_pause_or_manual_mode_never_authorizes(self):
        for field in ('enabled','sending_enabled','autonomous_email_enabled'):
            db=MagicMock();db.settings.return_value={k:k!=field for k in ('enabled','sending_enabled','autonomous_email_enabled')}
            self.assertEqual(agent.authorize_autonomous(db),0);db.rpc.assert_not_called()

    def test_concurrent_opt_out_during_preparation_is_not_authorized(self):
        db=MagicMock();db.settings.return_value=dict(enabled=True,sending_enabled=True,autonomous_email_enabled=True)
        db.call.side_effect=[[buyer()],[]]
        self.assertEqual(agent.authorize_autonomous(db),0);db.rpc.assert_not_called()

    def test_templates_have_no_prices_or_unverified_results(self):
        for role in ('sports_club','employer_cse'):
            subject,body=agent.autonomous_message(buyer(buyer_role=role))
            self.assertIn('Club de handball exemple',body);self.assertIn('distance',body)
            self.assertLessEqual(len(subject),160);self.assertLessEqual(len(body),1800)
            self.assertNotIn('€',body);self.assertNotIn('garanti',body)

    def test_public_individual_request_requires_real_recent_date(self):
        row=buyer(kind='individual',buyer_role='individual_request',email='',request_date=agent.now().date().isoformat(),
            evidence='Je recherche un coach sportif à distance pour améliorer ma préparation physique.')
        citations={row['source_url']}
        self.assertTrue(agent.validate_candidate(row,citations))
        self.assertFalse(agent.autonomous_candidate(row))
        self.assertFalse(agent.validate_candidate({**row,'request_date':'2020-01-01'},citations))
        self.assertFalse(agent.validate_candidate({**row,'request_date':''},citations))
        self.assertFalse(agent.validate_candidate({**row,'evidence':'Je recherche un coach pour mon enfant et sa préparation physique.'},citations))

if __name__=='__main__':unittest.main()
