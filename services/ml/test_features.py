import unittest
from features import CODES,vector,samples
from train import make_synthetic_demo
class FeatureTests(unittest.TestCase):
 def test_vector(self):
  x=vector({'cuisine_asian':1},{'cuisine_asian':0.8})
  self.assertEqual(len(x),3*len(CODES))
  self.assertAlmostEqual(x[2*len(CODES)+CODES.index('cuisine_asian')],0.8)
 def test_synthetic_for_smoke_tests_only(self):
  r=make_synthetic_demo()
  X,y,g=samples(r)
  self.assertEqual(X.shape,(320,3*len(CODES)))
  self.assertEqual(len(set(g)),16)
if __name__=='__main__':unittest.main()
