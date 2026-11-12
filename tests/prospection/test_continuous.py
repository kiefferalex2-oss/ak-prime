import datetime as dt
from email.message import Message
import importlib.util
import os
from pathlib import Path
import socket
import sys
import unittest
from unittest.mock import MagicMock,patch
sys.path.insert(0,str(Path(__file__).parents[2]/'tools/prospection'))
spec=importlib.util.spec_from_file_location('continuous_agent',Path(__file__).parents[2]/'tools/prospection/agent.py')
agent=importlib.util.module_from_spec(spec);spec.loader.exec_module(agent)

def response(status=200,location=None):
    result=MagicMock();result.status=status;result.headers=Message()
    result.headers['Content-Type']='text/html; charset=utf-8'
    if location:result.headers['Location']=location
    result.read.return_value='<html>Club de handball — préparation sportive. <a href="mailto:contact@example.org">Écrire</a></html>'.encode()
    return result

class SourceTests(unittest.TestCase):
    def setUp(self):agent.SOURCE_CACHE.clear()
    def test_https_redirect_is_validated_and_fetched(self):
        a,b=MagicMock(),MagicMock();a.getresponse.return_value=response(308,'https://www.example.org/contact');b.getresponse.return_value=response()
        addresses=[(socket.AF_INET,1,6,'',('93.184.216.34',443))]
        with patch.object(agent.socket,'getaddrinfo',return_value=addresses),patch.object(agent.http.client,'HTTPSConnection',side_effect=[a,b]) as connect:
            text=agent.source_text('https://example.org/')
        self.assertIn('contact@example.org',text);self.assertEqual(connect.call_count,2)
    def test_redirect_to_private_ip_is_blocked(self):
        conn=MagicMock();conn.getresponse.return_value=response(302,'https://internal.example/')
        def addresses(host,*args,**kw):return [(socket.AF_INET,1,6,'',('127.0.0.1' if host=='internal.example' else '93.184.216.34',443))]
        with patch.object(agent.socket,'getaddrinfo',side_effect=addresses),patch.object(agent.http.client,'HTTPSConnection',return_value=conn) as connect:
            with self.assertRaises(ValueError):agent.source_text('https://example.org/')
            self.assertEqual(connect.call_count,1)
    def test_ipv4_is_preferred_and_connection_is_pinned(self):
        conn=MagicMock();conn.getresponse.return_value=response()
        addresses=[(socket.AF_INET6,1,6,'',('2606:4700:4700::1111',443)),(socket.AF_INET,1,6,'',('93.184.216.34',443))]
        with patch.object(agent.socket,'getaddrinfo',return_value=addresses),patch.object(agent.http.client,'HTTPSConnection',return_value=conn),patch.object(agent.socket,'create_connection') as create:
            agent.source_text('https://example.org/')
            conn._create_connection(('example.org',443),10)
            self.assertEqual(create.call_args.args[0],('93.184.216.34',443))

class BudgetAndQueueTests(unittest.TestCase):
    def test_unknown_model_cannot_spend_reserved_budget(self):
        with patch.dict(os.environ,{'PROSPECTION_OPENAI_API_KEY':'fake','PROSPECTION_MODEL':'unpriced-model'}),patch.object(agent,'request_json') as request:
            with self.assertRaises(RuntimeError):agent.ask_model({'input':'test'})
            request.assert_not_called()
    def test_oversized_input_is_rejected_before_api_request(self):
        with patch.dict(os.environ,{'PROSPECTION_OPENAI_API_KEY':'fake','PROSPECTION_MODEL':'gpt-4.1-mini'}),patch.object(agent,'request_json') as request:
            with self.assertRaises(RuntimeError):agent.ask_model({'input':'x'*26000})
            request.assert_not_called()
    def test_no_api_call_without_atomic_reservation(self):
        db=MagicMock();db.rpc.return_value=False
        with patch.dict(os.environ,{'PROSPECTION_OPENAI_API_KEY':'fake'}),patch.object(agent,'ask_model') as ask:
            self.assertEqual(agent.discover(db,{}),0);ask.assert_not_called()
    def test_unverifiable_source_stays_unsendable_and_is_retried_without_ai(self):
        db=MagicMock();db.metrics=dict(checked=0,candidates=0,added=0,verified=0,sent=0)
        lead=dict(id='test',source_url='https://example.org/',contact_url='https://example.org/contact',evidence='Exact citation from the source page.',proposed_email='contact@example.org',verification_attempts=0)
        db.call.side_effect=[[lead],None]
        with patch.object(agent,'source_text',side_effect=OSError('offline')),patch.object(agent,'ask_model') as ask:
            agent.verify_pending(db)
            ask.assert_not_called()
        patch_data=db.call.call_args.args[2]
        self.assertEqual(patch_data['verification_attempts'],1)
        self.assertNotIn('source_verified',patch_data)
        self.assertNotIn('email',patch_data)

if __name__=='__main__':unittest.main()
