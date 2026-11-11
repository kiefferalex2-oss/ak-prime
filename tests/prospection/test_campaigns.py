import datetime as dt
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock
sys.path.insert(0,str(Path(__file__).parents[2]/'tools/prospection'))
from campaigns import valid_draft, prepare_campaigns

def draft(**changes):
    return dict(kind='publication',channel='facebook',pole='mental',title='Des repères pour avancer',
                body='Un accompagnement à distance avec des routines adaptées et un bilan offert.',
                visual_title='Retrouver vos repères',visual_points='Confiance et concentration\nRoutines adaptées\nUn suivi à distance',
                rationale='Présenter le pôle mental sans promesse de résultat.',**changes)

class CampaignTests(unittest.TestCase):
    def test_valid_publication(self):self.assertTrue(valid_draft(draft()))
    def test_unknown_channel_rejected(self):
        value=draft();value['channel']='automatic_dm';self.assertFalse(valid_draft(value))
    def test_suggestion_cannot_be_posted_as_publication(self):
        value=draft();value.update(kind='suggestion',channel='facebook');self.assertFalse(valid_draft(value))
        value['channel']='strategy';self.assertTrue(valid_draft(value))
    def test_graphic_overflow_is_not_silently_truncated(self):
        value=draft();value['visual_points']='un\ndeux\ntrois\nquatre';self.assertFalse(valid_draft(value))
    def test_no_model_call_when_daily_reservation_taken(self):
        db=MagicMock();db.rpc.return_value=False;model=MagicMock()
        self.assertEqual(prepare_campaigns(db,model,lambda x:'',dt.datetime.now(dt.timezone.utc)),0)
        model.assert_not_called()

if __name__=='__main__':unittest.main()
