/*
  stats.test.js — reference-value tests for assets/js/stats.js (HANDBOOK §7.1).
  Each block records the NumPy/SciPy snippet that produced its expected values
  (NumPy 2.4.4, SciPy 1.17.1, Python 3.13). Closed forms: tolerance 1e-12 unless
  the reference itself carries float noise, then 1e-9. Samplers: seeded 100k
  draws; mean and variance must land within ~5 standard errors of the truth.
*/
(function () {
  "use strict";
  var test = StatLabTests.test;
  var stats = window.stats;

  function near(assert, actual, expected, tol) { assert.close(actual, expected, tol === undefined ? 1e-12 : tol); }

  /* ---- 1. Combinatorics ------------------------------------------------ */
  // from scipy.special import gammaln, comb; import math
  // gammaln(n+1)  →  ln(n!)
  test("logFactorial: matches scipy gammaln(n+1)", function (a) {
    near(a, stats.logFactorial(0), 0);
    near(a, stats.logFactorial(1), 0);
    near(a, stats.logFactorial(5), 4.787491742782046);
    near(a, stats.logFactorial(20), 42.335616460753485);
    near(a, stats.logFactorial(50), 148.47776695177302);
    near(a, stats.logFactorial(170), 706.5730622457875, 1e-9);
  });
  // math.factorial(n)
  test("factorial: exact for small n, matches math.factorial to 1e-12 relative", function (a) {
    a.equal(stats.factorial(0), 1);
    a.equal(stats.factorial(1), 1);
    a.equal(stats.factorial(5), 120);
    a.equal(stats.factorial(10), 3628800);
    near(a, stats.factorial(20) / 2432902008176640000, 1);
    near(a, stats.factorial(22) / 1124000727777607680000, 1);
    near(a, stats.factorial(170) / 7.257415615307999e306, 1);
    a.equal(stats.factorial(171), Infinity);
  });
  // gammaln(n+1) - gammaln(k+1) - gammaln(n-k+1)
  test("logChoose: matches scipy gammaln difference", function (a) {
    near(a, stats.logChoose(5, 2), 2.3025850929940455);
    near(a, stats.logChoose(10, 0), 0);
    near(a, stats.logChoose(10, 10), 0);
    near(a, stats.logChoose(20, 7), 11.25829124656465);
    near(a, stats.logChoose(52, 5), 14.770621922970378);
    near(a, stats.logChoose(60, 30), 39.31170072601131);
    near(a, stats.logChoose(1000, 500), 689.4672615678519, 1e-9);
    a.equal(stats.logChoose(5, 6), -Infinity);
    a.equal(stats.logChoose(5, -1), -Infinity);
  });
  // comb(n, k, exact=True)
  test("choose: matches scipy comb(exact=True)", function (a) {
    a.equal(stats.choose(5, 2), 10);
    a.equal(stats.choose(10, 0), 1);
    a.equal(stats.choose(10, 10), 1);
    a.equal(stats.choose(20, 7), 77520);
    a.equal(stats.choose(52, 5), 2598960);
    a.equal(stats.choose(100, 3), 161700);
    near(a, stats.choose(60, 30) / 118264581564861424, 1, 1e-12);
    a.equal(stats.choose(5, 6), 0);
    a.equal(stats.choose(5, -1), 0);
  });

  /* ---- 2. erf / erfc -------------------------------------------------- */
  // from scipy.special import erf, erfc
  test("erf: matches scipy.special.erf across both branches", function (a) {
    near(a, stats.erf(0), 0);
    near(a, stats.erf(0.1), 0.1124629160182849);
    near(a, stats.erf(0.5), 0.5204998778130465);
    near(a, stats.erf(1), 0.8427007929497148);
    near(a, stats.erf(1.5), 0.9661051464753108);
    near(a, stats.erf(2), 0.9953222650189527);
    near(a, stats.erf(2.5), 0.999593047982555);
    near(a, stats.erf(2.999), 0.9999777698314002);
    near(a, stats.erf(3), 0.9999779095030014);
    near(a, stats.erf(3.5), 0.9999992569016276);
    near(a, stats.erf(4), 0.9999999845827421);
    near(a, stats.erf(5), 0.9999999999984626);
    near(a, stats.erf(6), 1);
    near(a, stats.erf(-0.5), -0.5204998778130465);
    near(a, stats.erf(-2), -0.9953222650189527);
    near(a, stats.erf(-4), -0.9999999845827421);
  });
  test("erfc: matches scipy.special.erfc, tails to relative 1e-12", function (a) {
    near(a, stats.erfc(0), 1);
    near(a, stats.erfc(0.5), 0.4795001221869535);
    near(a, stats.erfc(1), 0.15729920705028516);
    near(a, stats.erfc(1.5) / 0.033894853524689274, 1);
    near(a, stats.erfc(2) / 0.004677734981047266, 1);
    near(a, stats.erfc(2.5) / 0.0004069520174449589, 1);
    near(a, stats.erfc(2.999) / 2.223016859983405e-05, 1);
    near(a, stats.erfc(3) / 2.2090496998585445e-05, 1);
    near(a, stats.erfc(3.5) / 7.430983723414127e-07, 1);
    near(a, stats.erfc(4) / 1.541725790028002e-08, 1);
    near(a, stats.erfc(5) / 1.5374597944280353e-12, 1);
    near(a, stats.erfc(6) / 2.151973671249891e-17, 1);
    near(a, stats.erfc(-0.5), 1.5204998778130465);
    near(a, stats.erfc(-2), 1.9953222650189528);
    near(a, stats.erfc(-4), 1.999999984582742);
  });

  /* ---- 3. Distributions ----------------------------------------------- */
  // from scipy.stats import norm; norm.pdf(x, mu, sigma); norm.cdf(x, mu, sigma)
  test("normalPdf: matches scipy norm.pdf", function (a) {
    near(a, stats.normalPdf(0), 0.3989422804014327);
    near(a, stats.normalPdf(1), 0.24197072451914337);
    near(a, stats.normalPdf(-1, 0, 1), 0.24197072451914337);
    near(a, stats.normalPdf(1.96), 0.058440944333451476);
    near(a, stats.normalPdf(-3), 0.0044318484119380075);
    near(a, stats.normalPdf(8) / 5.052271083536893e-15, 1);
    near(a, stats.normalPdf(100, 90, 15), 0.02129653370149015);
    near(a, stats.normalPdf(62, 70, 4), 0.013497741628297016);
    near(a, stats.normalPdf(0.5), 0.3520653267642995);
  });
  test("normalCdf: matches scipy norm.cdf, including far lower tail", function (a) {
    near(a, stats.normalCdf(0), 0.5);
    near(a, stats.normalCdf(1), 0.8413447460685429);
    near(a, stats.normalCdf(-1), 0.15865525393145707);
    near(a, stats.normalCdf(1.96), 0.9750021048517795);
    near(a, stats.normalCdf(-3), 0.001349898031630093);
    near(a, stats.normalCdf(-8) / 6.22096057427174e-16, 1);
    near(a, stats.normalCdf(8), 0.9999999999999993);
    near(a, stats.normalCdf(100, 90, 15), 0.7475074624530771);
    near(a, stats.normalCdf(62, 70, 4), 0.022750131948179198);
    near(a, stats.normalCdf(0.5), 0.6914624612740131);
  });
  // from scipy.stats import binom; binom.pmf(k, n, p); binom.cdf(k, n, p)
  test("binomialPmf: matches scipy binom.pmf", function (a) {
    near(a, stats.binomialPmf(0, 10, 0.3), 0.02824752490000001);
    near(a, stats.binomialPmf(3, 10, 0.3), 0.2668279319999998);
    near(a, stats.binomialPmf(10, 10, 0.3), 5.9048999999999975e-06);
    near(a, stats.binomialPmf(5, 20, 0.5), 0.014785766601562505);
    near(a, stats.binomialPmf(0, 5, 0), 1);
    near(a, stats.binomialPmf(5, 5, 1), 1);
    near(a, stats.binomialPmf(2, 5, 1), 0);
    near(a, stats.binomialPmf(50, 100, 0.5), 0.07958923738717871);
    near(a, stats.binomialPmf(7, 7, 0.9), 0.4782969000000001);
    a.equal(stats.binomialPmf(11, 10, 0.3), 0);
    a.equal(stats.binomialPmf(-1, 10, 0.3), 0);
    a.equal(stats.binomialPmf(2.5, 10, 0.3), 0);
  });
  test("binomialCdf: matches scipy binom.cdf", function (a) {
    near(a, stats.binomialCdf(0, 10, 0.3), 0.028247524900000005);
    near(a, stats.binomialCdf(3, 10, 0.3), 0.6496107184000002);
    near(a, stats.binomialCdf(10, 10, 0.3), 1);
    near(a, stats.binomialCdf(5, 20, 0.5), 0.020694732666015625);
    near(a, stats.binomialCdf(2, 5, 1), 0);
    near(a, stats.binomialCdf(50, 100, 0.5), 0.5397946186935891);
    a.equal(stats.binomialCdf(-1, 10, 0.3), 0);
    near(a, stats.binomialCdf(3.9, 10, 0.3), 0.6496107184000002);
  });
  // from scipy.stats import poisson; poisson.pmf(k, lam); poisson.cdf(k, lam)
  test("poissonPmf: matches scipy poisson.pmf", function (a) {
    near(a, stats.poissonPmf(0, 2), 0.1353352832366127);
    near(a, stats.poissonPmf(2, 2), 0.2706705664732254);
    near(a, stats.poissonPmf(5, 2), 0.03608940886309672);
    near(a, stats.poissonPmf(0, 0), 1);
    near(a, stats.poissonPmf(1, 0), 0);
    near(a, stats.poissonPmf(10, 10), 0.12511003572113372);
    near(a, stats.poissonPmf(30, 10) / 1.7115717355368203e-07, 1);
    near(a, stats.poissonPmf(50, 50), 0.05632500632519166);
    near(a, stats.poissonPmf(0, 0.5), 0.6065306597126334);
    a.equal(stats.poissonPmf(-1, 2), 0);
    a.equal(stats.poissonPmf(1.5, 2), 0);
  });
  test("poissonCdf: matches scipy poisson.cdf", function (a) {
    near(a, stats.poissonCdf(0, 2), 0.1353352832366127);
    near(a, stats.poissonCdf(2, 2), 0.6766764161830636);
    near(a, stats.poissonCdf(5, 2), 0.9834363915193856);
    near(a, stats.poissonCdf(1, 0), 1);
    near(a, stats.poissonCdf(10, 10), 0.5830397501929849);
    near(a, stats.poissonCdf(30, 10), 0.9999999201620534);
    near(a, stats.poissonCdf(50, 50), 0.5375166908531476);
    a.equal(stats.poissonCdf(-1, 2), 0);
  });
  // from scipy.stats import uniform; uniform.pdf(x, a, b-a); uniform.cdf(x, a, b-a)
  test("uniformPdf / uniformCdf: match scipy uniform", function (a) {
    near(a, stats.uniformPdf(0.5, 0, 1), 1);
    near(a, stats.uniformPdf(2, 1, 4), 0.3333333333333333);
    near(a, stats.uniformPdf(1, 1, 4), 0.3333333333333333);
    near(a, stats.uniformPdf(4, 1, 4), 0.3333333333333333);
    near(a, stats.uniformPdf(0, 1, 4), 0);
    near(a, stats.uniformPdf(5, 1, 4), 0);
    near(a, stats.uniformCdf(0.5, 0, 1), 0.5);
    near(a, stats.uniformCdf(2, 1, 4), 0.3333333333333333);
    near(a, stats.uniformCdf(1, 1, 4), 0);
    near(a, stats.uniformCdf(4, 1, 4), 1);
    near(a, stats.uniformCdf(0, 1, 4), 0);
    near(a, stats.uniformCdf(5, 1, 4), 1);
  });
  // from scipy.stats import expon; expon.pdf(x, scale=1/rate); expon.cdf(x, scale=1/rate)
  test("exponentialPdf / exponentialCdf: match scipy expon", function (a) {
    near(a, stats.exponentialPdf(0, 1), 1);
    near(a, stats.exponentialPdf(1, 1), 0.36787944117144233);
    near(a, stats.exponentialPdf(2, 0.5), 0.18393972058572117);
    near(a, stats.exponentialPdf(0.3, 3), 1.2197089792217974);
    near(a, stats.exponentialPdf(-1, 1), 0);
    near(a, stats.exponentialCdf(0, 1), 0);
    near(a, stats.exponentialCdf(1, 1), 0.6321205588285577);
    near(a, stats.exponentialCdf(2, 0.5), 0.6321205588285577);
    near(a, stats.exponentialCdf(0.3, 3), 0.5934303402594009);
    near(a, stats.exponentialCdf(-1, 1), 0);
  });
  test("bernoulliPmf: p at 1, 1−p at 0, 0 elsewhere", function (a) {
    near(a, stats.bernoulliPmf(1, 0.3), 0.3);
    near(a, stats.bernoulliPmf(0, 0.3), 0.7);
    a.equal(stats.bernoulliPmf(2, 0.3), 0);
  });

  // from scipy.stats import geom; geom.pmf(k, p); geom.cdf(k, p)   (support starts at 1)
  test("geometricPmf / geometricCdf: match scipy geom", function (a) {
    near(a, stats.geometricPmf(1, 0.3), 0.3); near(a, stats.geometricCdf(1, 0.3), 0.3);
    near(a, stats.geometricPmf(2, 0.3), 0.21); near(a, stats.geometricCdf(2, 0.3), 0.51);
    near(a, stats.geometricPmf(5, 0.3), 0.07202999999999998); near(a, stats.geometricCdf(5, 0.3), 0.83193);
    near(a, stats.geometricPmf(10, 0.3), 0.012106082099999993); near(a, stats.geometricCdf(10, 0.3), 0.9717524751);
    near(a, stats.geometricPmf(1, 1), 1); near(a, stats.geometricPmf(2, 1), 0); near(a, stats.geometricCdf(2, 1), 1);
    near(a, stats.geometricPmf(40, 0.05), 0.006763797713952796); near(a, stats.geometricCdf(40, 0.05), 0.8714878434348966);
    near(a, stats.geometricPmf(3, 0.5), 0.125); near(a, stats.geometricCdf(3, 0.5), 0.875);
    near(a, stats.geometricPmf(100, 0.02), 0.0027065215488725094); near(a, stats.geometricCdf(100, 0.02), 0.8673804441052468);
    a.equal(stats.geometricPmf(0, 0.3), 0); a.equal(stats.geometricPmf(2.5, 0.3), 0); a.equal(stats.geometricCdf(0, 0.3), 0);
  });
  // from scipy.stats import hypergeom; hypergeom(M=N, n=K, N=n).pmf(k) / .cdf(k)
  test("hypergeometricPmf / hypergeometricCdf: match scipy hypergeom", function (a) {
    near(a, stats.hypergeometricPmf(0, 52, 4, 5), 0.6588419983377967); near(a, stats.hypergeometricCdf(0, 52, 4, 5), 0.6588419983377967);
    near(a, stats.hypergeometricPmf(1, 52, 4, 5), 0.2994736356080894); near(a, stats.hypergeometricCdf(1, 52, 4, 5), 0.958315633945886);
    near(a, stats.hypergeometricPmf(2, 52, 4, 5), 0.03992981808107859); near(a, stats.hypergeometricCdf(2, 52, 4, 5), 0.9982454520269647);
    near(a, stats.hypergeometricPmf(4, 52, 4, 5), 1.846892603195124e-05); near(a, stats.hypergeometricCdf(4, 52, 4, 5), 1);
    a.equal(stats.hypergeometricPmf(5, 52, 4, 5), 0, "more successes than exist is impossible");
    near(a, stats.hypergeometricPmf(3, 10, 10, 3), 1); near(a, stats.hypergeometricPmf(0, 10, 0, 3), 1);
    near(a, stats.hypergeometricPmf(6, 20, 7, 12), 0.0953560371517028); near(a, stats.hypergeometricCdf(6, 20, 7, 12), 0.9897832817337461);
    near(a, stats.hypergeometricPmf(2, 20, 7, 12), 0.047678018575851404); near(a, stats.hypergeometricCdf(2, 20, 7, 12), 0.05211558307533541);
    near(a, stats.hypergeometricPmf(7, 20, 7, 12), 0.010216718266253873);
    near(a, stats.hypergeometricPmf(0, 20, 7, 12), 0.00010319917440660477);
    a.equal(stats.hypergeometricPmf(-1, 20, 7, 12), 0);
    a.equal(stats.hypergeometricPmf(0, 20, 12, 12), 0, "below the minimum possible count is impossible (n − (N − K) = 4)");
    var total = 0; for (var k = 0; k <= 5; k++) total += stats.hypergeometricPmf(k, 52, 4, 5);
    near(a, total, 1, 1e-12);
  });

  // from scipy.special import gammaln, betainc; from scipy.stats import t, norm
  test("logGamma: matches scipy gammaln (Lanczos g=7)", function (a) {
    near(a, stats.logGamma(0.5), 0.5723649429247); near(a, stats.logGamma(1), 0); near(a, stats.logGamma(2), 0);
    near(a, stats.logGamma(1.5), -0.12078223763524526); near(a, stats.logGamma(3.7), 1.428072326665388);
    near(a, stats.logGamma(10), 12.801827480081469); near(a, stats.logGamma(50.5), 146.51925549072064, 1e-11);
    near(a, stats.logGamma(100), 359.1342053695754, 1e-11); near(a, stats.logGamma(170.5), 704.0044277342047, 1e-10);
    near(a, stats.logGamma(0.1), 2.252712651734206); near(a, stats.logGamma(0.001), 6.907178885383853);
    near(a, stats.logGamma(1000), 5905.220423209181, 1e-9);
    near(a, stats.logBeta(2, 3), Math.log(1 / 12));
  });
  test("incompleteBeta: matches scipy betainc(a, b, x), including tiny values relatively", function (a) {
    near(a, stats.incompleteBeta(0.5, 1, 1), 0.5); near(a, stats.incompleteBeta(0.2, 2, 3), 0.18080000000000004);
    near(a, stats.incompleteBeta(0.8, 2, 3), 0.9728); near(a, stats.incompleteBeta(0.5, 0.5, 0.5), 0.5);
    near(a, stats.incompleteBeta(0.1, 10, 10) / 3.929882327128003e-06, 1, 1e-10);
    near(a, stats.incompleteBeta(0.9, 10, 10), 0.9999960701176729);
    near(a, stats.incompleteBeta(0.3, 0.5, 5), 0.9347377538310915); near(a, stats.incompleteBeta(0.99, 5, 0.5), 0.7571581091015623);
    near(a, stats.incompleteBeta(0.5, 30, 0.5) / 1.330205935552925e-10, 1, 1e-9);
    near(a, stats.incompleteBeta(0.001, 1, 1), 0.001); near(a, stats.incompleteBeta(0.7, 50, 60), 0.9999999530579958);
    a.equal(stats.incompleteBeta(0, 2, 3), 0); a.equal(stats.incompleteBeta(1, 2, 3), 1);
  });
  test("tCdf / tPdf: match scipy t.cdf and t.pdf", function (a) {
    [[0, 1, 0.5, 0.31830988618379075], [1, 1, 0.75, 0.15915494309189535], [2, 1, 0.8524163823495667, 0.06366197723675814],
     [1, 3, 0.8044988905221148, 0.206748335783172], [2.5, 3, 0.9561466764959672, 0.0386614857271673],
     [-1.5, 5, 0.09695184012123659, 0.12451734464635511], [2, 10, 0.9633059826146299, 0.061145766321218174],
     [1.96, 30, 0.9703288435519748, 0.061119852876620695], [3, 60, 0.9980361513335136, 0.005595210866887551],
     [-4, 2, 0.028595479208968315, 0.0130945700219731], [10, 1, 0.9682744825694465, 0.0031515830315226798],
     [0.5, 200, 0.6911876238417696, 0.35143339354349407], [-2.5, 4, 0.03338327240599407, 0.03567562436955665]
    ].forEach(function (c) { near(a, stats.tCdf(c[0], c[1]), c[2], 1e-12); near(a, stats.tPdf(c[0], c[1]), c[3], 1e-12); });
  });
  test("tQuantile: matches scipy t.ppf (bisection)", function (a) {
    near(a, stats.tQuantile(0.975, 1), 12.706204736174694, 1e-8); near(a, stats.tQuantile(0.975, 2), 4.302652729749462, 1e-9);
    near(a, stats.tQuantile(0.975, 5), 2.5705818356363146, 1e-9); near(a, stats.tQuantile(0.975, 10), 2.228138851986274, 1e-9);
    near(a, stats.tQuantile(0.975, 30), 2.0422724563012378, 1e-9); near(a, stats.tQuantile(0.975, 1000), 1.9623390808264078, 1e-9);
    near(a, stats.tQuantile(0.9, 3), 1.6377443536962093, 1e-9); near(a, stats.tQuantile(0.995, 7), 3.4994832973504924, 1e-9);
    near(a, stats.tQuantile(0.025, 12), -2.1788128296672293, 1e-9); a.equal(stats.tQuantile(0.5, 4), 0);
    near(a, stats.tQuantile(0.6, 20), 0.25674275385450196, 1e-9);
    near(a, stats.tCdf(stats.tQuantile(0.83, 7), 7), 0.83, 1e-12, "round trip");
  });
  test("normalQuantile: matches scipy norm.ppf", function (a) {
    a.equal(stats.normalQuantile(0.5), 0);
    near(a, stats.normalQuantile(0.975), 1.959963984540054, 1e-10); near(a, stats.normalQuantile(0.025), -1.9599639845400545, 1e-10);
    near(a, stats.normalQuantile(0.9), 1.2815515655446004, 1e-10); near(a, stats.normalQuantile(0.995), 2.5758293035489004, 1e-10);
    near(a, stats.normalQuantile(0.8), 0.8416212335729143, 1e-10); near(a, stats.normalQuantile(0.1), -1.2815515655446004, 1e-10);
    near(a, stats.normalQuantile(1e-6), -4.753424308822899, 1e-8); near(a, stats.normalQuantile(0.999999), 4.753424308817087, 1e-8);
    near(a, stats.normalQuantile(0.6), 0.2533471031357997, 1e-10);
    near(a, stats.normalQuantile(0.975, 50, 10), 69.59963984540053, 1e-9);
  });

  // scipy.stats.ttest_ind(x, y, equal_var=False); df by the Welch–Satterthwaite formula
  test("welchTest: matches scipy ttest_ind(equal_var=False) and the Welch df", function (a) {
    var r = stats.welchTest([82, 75, 91, 68, 77, 85, 79, 88], [70, 65, 80, 72, 61, 75, 69]);
    near(a, r.t, 2.916528087455292, 1e-12); near(a, r.df, 12.987426185246942, 1e-12); near(a, r.p, 0.01203071629775824, 1e-12);
    r = stats.welchTest([1.2, 3.4, 2.2, 4.8, 3.1], [2.0, 2.9, 3.5, 1.8, 2.6, 3.3]);
    near(a, r.t, 0.38611652578635824, 1e-12); near(a, r.df, 5.6964598286619665, 1e-12); near(a, r.p, 0.7134171836946601, 1e-12);
    var s = stats.welchTest([1, 2, 3], [1, 2, 3]); a.equal(s.t, 0); near(a, s.p, 1, 1e-12);
  });
  // scipy.stats.ttest_rel(after, before)
  test("pairedTest: matches scipy ttest_rel", function (a) {
    var r = stats.pairedTest([60, 72, 55, 68, 80, 63, 70, 58], [64, 75, 59, 67, 86, 66, 74, 62]);
    near(a, r.t, 4.783660530571633, 1e-12); a.equal(r.df, 7); near(a, r.p, 0.0020037726546340935, 1e-12);
    near(a, r.meanDiff, 3.375, 1e-12); near(a, r.sdDiff, 1.9955307206712847, 1e-12);
  });
  // pooled two-proportion z: pc = (x1+x2)/(n1+n2); z = (p1−p2)/sqrt(pc(1−pc)(1/n1+1/n2)); p = 2(1−Φ|z|)
  test("twoProportionTest: matches the pooled z computed independently", function (a) {
    var r = stats.twoProportionTest(30, 200, 45, 200);
    near(a, r.z, -1.921537845661046, 1e-12); near(a, r.p, 0.054663935891675175, 1e-12); near(a, r.pooled, 0.1875, 1e-12); near(a, r.diff, -0.075, 1e-12);
    r = stats.twoProportionTest(12, 100, 8, 120); near(a, r.z, 1.3701581417242803, 1e-12); near(a, r.p, 0.17063754156700384, 1e-12);
    r = stats.twoProportionTest(500, 1000, 520, 1000); near(a, r.z, -0.894606130121643, 1e-12); near(a, r.p, 0.37099767373660786, 1e-12);
    r = stats.twoProportionTest(0, 50, 5, 50); near(a, r.z, -2.294157338705618, 1e-12); near(a, r.p, 0.021781462791119477, 1e-12);
    r = stats.twoProportionTest(10, 40, 10, 40); a.equal(r.z, 0); near(a, r.p, 1, 1e-12);
    r = stats.twoProportionTest(0, 40, 0, 40); a.equal(r.z, 0); a.equal(r.p, 1, "no successes anywhere: no evidence");
    r = stats.twoProportionTest(40, 40, 40, 40); a.equal(r.p, 1);
  });

  // scipy.special.gammainc(a, x)
  test("incompleteGamma: matches scipy gammainc (series and continued fraction)", function (a) {
    near(a, stats.incompleteGamma(1, 1), 0.6321205588285577); near(a, stats.incompleteGamma(2, 3), 0.8008517265285442);
    near(a, stats.incompleteGamma(0.5, 0.5), 0.6826894921370859); near(a, stats.incompleteGamma(5, 2), 0.052653017343711125);
    near(a, stats.incompleteGamma(5, 10), 0.9707473119230389); near(a, stats.incompleteGamma(10, 15), 0.9301463393005901);
    near(a, stats.incompleteGamma(0.5, 0.001), 0.035670591729679894); a.equal(stats.incompleteGamma(3, 0), 0);
    near(a, stats.incompleteGamma(50, 40), 0.07033506665939493, 1e-11); near(a, stats.incompleteGamma(50, 60), 0.915593318906308, 1e-11);
    near(a, stats.incompleteGamma(2.5, 2.5), 0.5841198130044919);
  });
  // scipy.stats.chi2.cdf / pdf / ppf
  test("chiSquareCdf / chiSquarePdf / chiSquareQuantile: match scipy chi2", function (a) {
    [[1, 1, 0.6826894921370859, 0.24197072451914337], [3.84, 1, 0.949956478751295, 0.029846887483060566], [2, 2, 0.6321205588285577, 0.18393972058572114],
     [5.99, 2, 0.9499633729134137, 0.02501831354329314], [7.81, 3, 0.949893943649994, 0.022455132960121398], [11.07, 5, 0.9499903813775945, 0.019328149897682452],
     [20, 10, 0.9707473119230389, 0.00945831870051767], [0.5, 4, 0.026499021160743912, 0.09735009788392562], [30, 20, 0.9301463393005901, 0.01620358360986844],
     [2, 1, 0.8427007929497151, 0.10377687435514868]].forEach(function (c) { near(a, stats.chiSquareCdf(c[0], c[1]), c[2], 1e-11); near(a, stats.chiSquarePdf(c[0], c[1]), c[3], 1e-12); });
    a.equal(stats.chiSquareCdf(0, 3), 0); a.equal(stats.chiSquarePdf(-1, 3), 0); a.equal(stats.chiSquarePdf(0, 2), 0.5);
    near(a, stats.chiSquareQuantile(0.95, 1), 3.8414588206941205, 1e-9); near(a, stats.chiSquareQuantile(0.95, 2), 5.99146454710798, 1e-9);
    near(a, stats.chiSquareQuantile(0.95, 5), 11.070497693516351, 1e-9); near(a, stats.chiSquareQuantile(0.99, 2), 9.21034037197618, 1e-9);
    near(a, stats.chiSquareQuantile(0.5, 3), 2.3659738843753377, 1e-9); near(a, stats.chiSquareQuantile(0.05, 10), 3.9402991361190605, 1e-9);
    near(a, stats.chiSquareQuantile(0.999, 1), 10.827566170662733, 1e-8);
  });
  // scipy.stats.chisquare(obs, expected)
  test("chiSquareGof: matches scipy chisquare", function (a) {
    var r = stats.chiSquareGof([22, 18, 26, 14, 20, 20], [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]);
    near(a, r.chi2, 4, 1e-12); a.equal(r.df, 5); near(a, r.p, 0.5494159513527803, 1e-11);
    near(a, r.contributions.reduce(function (x, y) { return x + y; }, 0), r.chi2, 1e-12);
    r = stats.chiSquareGof([30, 10, 25, 15, 12, 8], [0.3, 0.1, 0.2, 0.2, 0.1, 0.1]);
    near(a, r.chi2, 3.3, 1e-12); near(a, r.p, 0.6538416823944546, 1e-11);
    a.equal(JSON.stringify(r.expected), "[30,10,20,20,10,10]");
  });
  // scipy.stats.chi2_contingency(table, correction=False)
  test("chiSquareIndependence: matches scipy chi2_contingency without correction", function (a) {
    var r = stats.chiSquareIndependence([[20, 30, 10], [25, 15, 40]]);
    near(a, r.chi2, 21.12962962962963, 1e-11); a.equal(r.df, 2); near(a, r.p, 2.5808289612977576e-05, 1e-12);
    near(a, r.expected[0][0], 19.285714285714285, 1e-12); near(a, r.expected[1][2], 28.571428571428573, 1e-12);
    a.equal(JSON.stringify(r.rowTotals), "[60,80]"); a.equal(JSON.stringify(r.colTotals), "[45,45,50]"); a.equal(r.n, 140);
    r = stats.chiSquareIndependence([[10, 20], [30, 40]]);
    near(a, r.chi2, 0.7936507936507936, 1e-12); a.equal(r.df, 1); near(a, r.p, 0.37299848361348686, 1e-11);
    r = stats.chiSquareIndependence([[5, 5, 5], [5, 5, 5]]);
    a.equal(r.chi2, 0); a.equal(r.p, 1);
  });

  /* ---- 4. Descriptive ------------------------------------------------- */
  // import numpy as np; a = np.array(d, float)
  // a.sum(), a.mean(), a.var(ddof=1), a.var(), a.std(ddof=1), a.std(), np.median(a)
  var d1 = [2, 4, 4, 4, 5, 5, 7, 9];
  var d2 = [1.5, 2.5, 2.5, 2.75, 3.25, 4.75];
  var d3 = [10, 3.2, -1, 7.7, 3.2, 0];
  test("sum / mean: match numpy", function (a) {
    near(a, stats.sum(d1), 40); near(a, stats.mean(d1), 5);
    near(a, stats.sum(d2), 17.25); near(a, stats.mean(d2), 2.875);
    near(a, stats.sum(d3), 23.099999999999998); near(a, stats.mean(d3), 3.8499999999999996);
    near(a, stats.mean([5]), 5);
    a.ok(isNaN(stats.mean([])), "mean of empty is NaN");
  });
  test("variance (ddof=1) / populationVariance (ddof=0): match numpy", function (a) {
    near(a, stats.variance(d1), 4.571428571428571); near(a, stats.populationVariance(d1), 4);
    near(a, stats.variance(d2), 1.16875); near(a, stats.populationVariance(d2), 0.9739583333333334);
    near(a, stats.variance(d3), 18.367); near(a, stats.populationVariance(d3), 15.305833333333334);
    near(a, stats.variance([1, 2]), 0.5); near(a, stats.populationVariance([1, 2]), 0.25);
    a.ok(isNaN(stats.variance([5])), "sample variance of one value is NaN");
    near(a, stats.populationVariance([5]), 0);
    a.ok(isNaN(stats.populationVariance([])), "population variance of empty is NaN");
  });
  test("sd / populationSd: match numpy std", function (a) {
    near(a, stats.sd(d1), 2.138089935299395); near(a, stats.populationSd(d1), 2);
    near(a, stats.sd(d2), 1.0810874155219827); near(a, stats.populationSd(d2), 0.986893273527251);
    near(a, stats.sd(d3), 4.28567380933267); near(a, stats.populationSd(d3), 3.912267032467663);
    near(a, stats.sd([1, 2]), 0.7071067811865476);
  });
  // np.quantile(a, p, method="weibull")
  test("quantile: matches numpy method='weibull'", function (a) {
    [[0, 2], [0.1, 2], [0.25, 4], [0.5, 4.5], [0.75, 6.5], [0.9, 9], [1, 9]].forEach(function (c) { near(a, stats.quantile(d1, c[0]), c[1]); });
    [[0, 1.5], [0.1, 1.5], [0.25, 2.25], [0.5, 2.625], [0.75, 3.625], [0.9, 4.75], [1, 4.75]].forEach(function (c) { near(a, stats.quantile(d2, c[0]), c[1]); });
    [[0, -1], [0.1, -1], [0.25, -0.25], [0.5, 3.2], [0.75, 8.275], [0.9, 10], [1, 10]].forEach(function (c) { near(a, stats.quantile(d3, c[0]), c[1]); });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (p) { near(a, stats.quantile([5], p), 5); });
    [[0, 1], [0.25, 1], [0.5, 1.5], [0.75, 2], [1, 2]].forEach(function (c) { near(a, stats.quantile([1, 2], c[0]), c[1]); });
    a.ok(isNaN(stats.quantile([], 0.5)), "quantile of empty is NaN");
    a.equal(d3[0], 10, "quantile must not sort its input in place");
  });
  // np.median(a)
  test("median / quartiles / iqr / fiveNumberSummary", function (a) {
    near(a, stats.median(d1), 4.5); near(a, stats.median(d2), 2.625); near(a, stats.median(d3), 3.2); near(a, stats.median([5]), 5);
    var q = stats.quartiles(d1); near(a, q.q1, 4); near(a, q.median, 4.5); near(a, q.q3, 6.5);
    near(a, stats.iqr(d1), 2.5); near(a, stats.iqr(d3), 8.525);
    var f = stats.fiveNumberSummary(d3);
    near(a, f.min, -1); near(a, f.q1, -0.25); near(a, f.median, 3.2); near(a, f.q3, 8.275); near(a, f.max, 10);
  });
  // from collections import Counter; c = Counter(d); m = max(c.values())
  // sorted(v for v in c if c[v] == m) if m > 1 else []
  test("mode: most frequent values ascending; none when all unique (OpenStax §2.5)", function (a) {
    a.equal(JSON.stringify(stats.mode(d1)), "[4]");
    a.equal(JSON.stringify(stats.mode(d2)), "[2.5]");
    a.equal(JSON.stringify(stats.mode(d3)), "[3.2]");
    a.equal(JSON.stringify(stats.mode([5])), "[]");
    a.equal(JSON.stringify(stats.mode([1, 2])), "[]");
    a.equal(JSON.stringify(stats.mode([3, 1, 3, 1, 2])), "[1,3]");
    a.equal(JSON.stringify(stats.mode([])), "[]");
  });
  test("zScore: (x − μ)/σ", function (a) {
    near(a, stats.zScore(85, 70, 10), 1.5);
    near(a, stats.zScore(62, 70, 4), -2);
  });
  test("welford: streaming mean/variance equal the two-pass results", function (a) {
    var w = stats.welford();
    a.ok(isNaN(w.mean) && isNaN(w.variance), "empty accumulator is NaN");
    d3.forEach(function (x) { w.push(x); });
    a.equal(w.n, 6);
    near(a, w.mean, 3.8499999999999996);
    near(a, w.variance, 18.367);
    near(a, w.populationVariance, 15.305833333333334);
    near(a, w.sd, 4.28567380933267);
    var w1 = stats.welford(); w1.push(5);
    near(a, w1.mean, 5); a.ok(isNaN(w1.variance), "one value: sample variance NaN"); near(a, w1.populationVariance, 0);
  });
  // v=[1..6]; p=[.1,.1,.1,.1,.1,.5]; ev=sum(a*b); var=sum((a-ev)**2*b)
  test("expectation / discreteVariance: loaded die", function (a) {
    var v = [1, 2, 3, 4, 5, 6], p = [0.1, 0.1, 0.1, 0.1, 0.1, 0.5];
    near(a, stats.expectation(v, p), 4.5);
    near(a, stats.discreteVariance(v, p), 3.25);
    near(a, stats.expectation([1, 2, 3, 4, 5, 6], [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]), 3.5);
    near(a, stats.discreteVariance([1, 2, 3, 4, 5, 6], [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]), 35 / 12);
  });

  // np.histogram(np.array(d, float), bins=np.arange(start, end + width/2, width))
  var commute = [9, 15, 51, 12, 31, 37, 41, 12, 43, 32, 46, 45, 34, 38, 13, 35, 37, 16, 50, 11, 37, 37, 31, 14, 12, 15, 45, 40, 14, 17, 13, 14, 48, 15, 29, 49, 14, 36, 13, 35, 27, 13, 36, 12, 37, 16, 15, 11, 46, 43, 42, 15, 30, 14, 47, 41, 13, 17, 40, 39, 13, 23, 30, 42, 36, 13, 10, 21, 22, 18, 36, 28, 39, 9, 50, 45, 56, 12, 50, 8];
  test("histogram: matches numpy.histogram with explicit edges (last bin right-closed)", function (a) {
    a.equal(JSON.stringify(stats.histogram(d1, 0, 10, 2)), JSON.stringify({ edges: [0, 2, 4, 6, 8, 10], counts: [0, 1, 5, 1, 1] }));
    a.equal(JSON.stringify(stats.histogram(d1, 0, 10, 5).counts), "[4,4]");
    a.equal(JSON.stringify(stats.histogram(d3, -2, 12, 2).counts), "[1,1,2,0,1,0,1]");
    a.equal(JSON.stringify(stats.histogram(commute, 5, 60, 5).counts), "[3,20,10,3,3,6,14,8,8,4,1]");
    a.equal(JSON.stringify(stats.histogram(commute, 0, 60, 10).counts), "[3,30,6,20,16,5]");
    a.equal(JSON.stringify(stats.histogram([10], 0, 10, 2).counts), "[0,0,0,0,1]", "value equal to end lands in the last bin");
    a.equal(JSON.stringify(stats.histogram([-1, 11, 5], 0, 10, 5).counts), "[0,1]", "values outside the range are ignored");
    a.equal(JSON.stringify(stats.histogram([], 0, 10, 5).counts), "[0,0]");
    a.equal(stats.histogram([0.3, 0.6, 0.9], 0, 1, 0.1).counts.reduce(function (x, y) { return x + y; }, 0), 3, "decimal widths count every value");
    var threw = false; try { stats.histogram([1], 0, 10, 3); } catch (e) { threw = e instanceof RangeError; }
    a.ok(threw, "non-multiple width throws");
  });
  // ((np.array(d) - np.mean(d)) ** 2).sum()
  test("sumSquaredDeviations: matches numpy", function (a) {
    near(a, stats.sumSquaredDeviations(d1), 32);
    near(a, stats.sumSquaredDeviations(d3), 91.83500000000001, 1e-9);
    near(a, stats.sumSquaredDeviations([5]), 0);
    a.ok(isNaN(stats.sumSquaredDeviations([])), "empty is NaN");
  });

  /* ---- 4b. Regression and correlation (Phase 17, D-014) ---------------- */
  // from scipy import stats as st; import numpy as np
  // r = st.linregress(x, y); r.slope, r.intercept, r.rvalue, r.rvalue**2, ((y - (r.intercept + r.slope*np.array(x)))**2).sum()
  var rx1 = [1, 2, 3, 4, 5, 6], ry1 = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2];
  var rx2 = [0, 2, 4, 6, 8, 10], ry2 = [9.5, 7.9, 6.1, 4.2, 2.0, 0.4];
  var rx3 = [1, 2, 3, 4, 5, 6, 7, 8, 9], ry3 = [9, 4, 1, 0, 1, 4, 9, 16, 25];
  test("linearRegression: matches scipy.stats.linregress", function (a) {
    var f = stats.linearRegression(rx1, ry1);
    near(a, f.slope, 2.0199999999999996, 1e-12); near(a, f.intercept, -0.019999999999998685, 1e-12);
    near(a, f.r, 0.9991049324808179, 1e-12); near(a, f.r2, 0.9982106661074996, 1e-12); near(a, f.sse, 0.12799999999999978, 1e-12);
    a.equal(f.n, 6); near(a, f.xMean, 3.5); near(a, f.yMean, 7.05); near(a, f.predict(7.5), 15.129999999999999, 1e-12);
    f = stats.linearRegression(rx2, ry2);
    near(a, f.slope, -0.9299999999999998, 1e-12); near(a, f.intercept, 9.666666666666666, 1e-12);
    near(a, f.r, -0.9989665273115697, 1e-12); near(a, f.r2, 0.997934122688937, 1e-12); near(a, f.sse, 0.12533333333333327, 1e-12);
    f = stats.linearRegression(rx3, ry3);   // a parabola: the line is a poor fit but still well defined
    near(a, f.slope, 2.0, 1e-12); near(a, f.intercept, -2.333333333333333, 1e-12); near(a, f.r, 0.6617825960083583, 1e-12); near(a, f.sse, 308.0, 1e-9);
    f = stats.linearRegression([1, 2, 3, 4], [5, 5, 5, 5]);   // linregress: slope 0.0, intercept 5.0, rvalue nan
    a.equal(f.slope, 0); a.equal(f.intercept, 5); a.ok(isNaN(f.r), "constant y has no correlation");
  });
  // np.corrcoef(x, y)[0, 1]
  test("correlation: matches numpy.corrcoef; NaN for a constant variable", function (a) {
    near(a, stats.correlation(rx1, ry1), 0.9991049324808178, 1e-12);
    near(a, stats.correlation(rx2, ry2), -0.9989665273115697, 1e-12);
    near(a, stats.correlation(rx3, ry3), 0.6617825960083583, 1e-12);
    near(a, stats.correlation(ry1, rx1), 0.9991049324808178, 1e-12, "symmetric");
    a.ok(isNaN(stats.correlation([1, 2, 3, 4], [5, 5, 5, 5])), "constant y");
    a.ok(isNaN(stats.correlation([2, 2, 2], [1, 2, 3])), "constant x");
  });
  // sum((yi - (a + b*xi))**2 for xi, yi in zip(x, y))
  test("sumSquaredResiduals: any line, equals sse at the fitted line", function (a) {
    near(a, stats.sumSquaredResiduals(rx1, ry1, 1, 2), 5.550000000000002, 1e-12);
    near(a, stats.sumSquaredResiduals(rx2, ry2, 10, -1), 0.47, 1e-12);
    var f = stats.linearRegression(rx1, ry1);
    near(a, stats.sumSquaredResiduals(rx1, ry1, f.intercept, f.slope), f.sse, 1e-12);
    a.ok(stats.sumSquaredResiduals(rx1, ry1, f.intercept + 0.1, f.slope) > f.sse, "the fitted line has the smallest SSE");
    a.ok(stats.sumSquaredResiduals(rx1, ry1, f.intercept, f.slope * 1.05) > f.sse);
  });

  /* ---- 4f. The F distribution and one-way ANOVA (Phase 18) ------------- */
  // from scipy import stats as st
  // st.f.pdf(x, d1, d2), st.f.cdf(x, d1, d2), st.f.ppf(p, d1, d2), st.f_oneway(*groups)
  test("fPdf: matches scipy.stats.f.pdf", function (a) {
    near(a, stats.fPdf(1, 3, 12), 0.41256420166237445, 1e-12);
    near(a, stats.fPdf(2.5, 3, 12), 0.09117723197252009, 1e-12);
    near(a, stats.fPdf(0.5, 1, 1), 0.30010543871903544, 1e-12);
    near(a, stats.fPdf(3, 5, 30), 0.03608388943744552, 1e-12);
    near(a, stats.fPdf(0.25, 10, 10), 0.2642411520000009, 1e-12);
    near(a, stats.fPdf(4, 2, 100), 0.019741878291812148, 1e-12);
    near(a, stats.fPdf(1, 1, 2), 0.19245008972987526, 1e-12);
    a.equal(stats.fPdf(0, 3, 12), 0, "df1 > 2 starts at zero");
    a.equal(stats.fPdf(0, 2, 10), 1, "df1 = 2 starts at one");
    a.equal(stats.fPdf(0, 1, 10), Infinity, "df1 = 1 has a pole at zero");
    a.equal(stats.fPdf(-1, 3, 12), 0, "negative F has no density");
  });
  test("fCdf: matches scipy.stats.f.cdf, including both tails", function (a) {
    near(a, stats.fCdf(1, 3, 12), 0.57377862073521, 1e-12);
    near(a, stats.fCdf(2.5, 3, 12), 0.8908452876049937, 1e-12);
    near(a, stats.fCdf(0.5, 1, 1), 0.39182655203060723, 1e-12);
    near(a, stats.fCdf(3, 5, 30), 0.9740630078867927, 1e-12);
    near(a, stats.fCdf(0.25, 10, 10), 0.019581440000000012, 1e-12);
    near(a, stats.fCdf(50, 2, 5), 0.9995051748520726, 1e-12);
    a.close(stats.fCdf(1e-8, 3, 12) / 1.4663085772540288e-12, 1, 1e-6, "tiny F keeps relative precision");
    a.close(stats.fCdf(0.001, 10, 10) / 1.2495493272492418e-13, 1, 1e-6);
    a.equal(stats.fCdf(0, 3, 12), 0); a.equal(stats.fCdf(-2, 3, 12), 0);
    a.ok(stats.fCdf(1000, 3, 12) > 0.9999999999);
  });
  test("fQuantile: matches scipy.stats.f.ppf and inverts fCdf", function (a) {
    near(a, stats.fQuantile(0.95, 3, 12), 3.490294819497605, 1e-9);
    near(a, stats.fQuantile(0.95, 2, 27), 3.3541308285291964, 1e-9);
    near(a, stats.fQuantile(0.99, 4, 20), 4.430690161437775, 1e-9);
    near(a, stats.fQuantile(0.5, 3, 12), 0.8353058985682883, 1e-9);
    near(a, stats.fQuantile(0.05, 3, 12), 0.11435575671012603, 1e-9);
    near(a, stats.fQuantile(0.95, 1, 1), 161.4476387975882, 1e-6);
    near(a, stats.fQuantile(0.9, 10, 10), 2.3226039408913097, 1e-9);
    [0.01, 0.25, 0.5, 0.9, 0.99].forEach(function (p) { near(a, stats.fCdf(stats.fQuantile(p, 4, 18), 4, 18), p, 1e-9, "round trip at p = " + p); });
  });
  test("anovaTest: matches scipy.stats.f_oneway with the sums of squares", function (a) {
    var r = stats.anovaTest([[6, 8, 4, 5, 3, 4], [8, 12, 9, 11, 6, 8], [13, 9, 11, 8, 7, 12]]);
    near(a, r.f, 9.264705882352942, 1e-12); near(a, r.p, 0.0023987773293929083, 1e-11);
    a.equal(r.df1, 2); a.equal(r.df2, 15); a.equal(r.k, 3); a.equal(r.n, 18);
    near(a, r.ssBetween, 84); near(a, r.ssWithin, 68);
    near(a, r.msBetween, 42); near(a, r.msWithin, 4.533333333333333);
    near(a, r.grandMean, 8); a.equal(JSON.stringify(r.groupMeans), "[5,9,10]");
    near(a, r.ssBetween / r.df1 / (r.ssWithin / r.df2), r.f, 1e-12, "F is MSB over MSW");
    r = stats.anovaTest([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    near(a, r.f, 27, 1e-12); near(a, r.p, 0.0010000000000000002, 1e-12); near(a, r.ssBetween, 54); near(a, r.ssWithin, 6);
    r = stats.anovaTest([[1, 2, 3, 4, 5], [1, 2, 3, 4, 5]]);
    a.equal(r.f, 0); a.equal(r.p, 1); a.equal(r.ssBetween, 0); near(a, r.msWithin, 2.5);
    r = stats.anovaTest([[10, 10, 10], [10, 10, 10]]);
    a.ok(isNaN(r.f) && isNaN(r.p), "no variation within groups gives NaN, as scipy");
    r = stats.anovaTest([[1, 2], [3, 4], [5, 6], [7, 8]]);
    a.equal(r.df1, 3); a.equal(r.df2, 4);
    near(a, r.p, 1 - stats.fCdf(r.f, r.df1, r.df2), 1e-12);
  });

  // from scipy.special import perm, comb; perm(n, k, exact=True), comb(n, k, exact=True)
  test("permutations: matches scipy.special.perm and equals choose × k!", function (a) {
    a.equal(stats.permutations(5, 2), 20); a.equal(stats.permutations(8, 3), 336);
    a.equal(stats.permutations(10, 0), 1); a.equal(stats.permutations(10, 10), 3628800);
    a.equal(stats.permutations(6, 6), 720); a.equal(stats.permutations(52, 5), 311875200);
    a.equal(stats.permutations(20, 4), 116280); a.equal(stats.permutations(7, 3), 210);
    a.equal(stats.permutations(3, 1), 3); a.equal(stats.permutations(170, 2), 28730);
    a.equal(stats.permutations(5, 6), 0, "k above n has no arrangements");
    a.equal(stats.permutations(5, -1), 0);
    a.equal(stats.permutations(0, 0), 1, "one way to arrange nothing");
    [[5, 2], [8, 3], [7, 3], [20, 4], [10, 10], [6, 0]].forEach(function (c) {
      a.equal(stats.permutations(c[0], c[1]), stats.choose(c[0], c[1]) * stats.factorial(c[1]), "P = C × k! at n = " + c[0] + ", k = " + c[1]);
    });
    a.equal(stats.permutations(9, 9), stats.factorial(9), "P(n, n) is n!");
  });

  /* ---- 4h. Beta density and Bayes' rule (Phase 21) --------------------- */
  // from scipy import stats as st; st.beta.pdf(x, a, b)
  test("betaPdf: matches scipy.stats.beta.pdf, including the endpoints", function (a) {
    near(a, stats.betaPdf(0.5, 2, 2), 1.5000000000000007, 1e-12);
    near(a, stats.betaPdf(0.3, 2, 5), 2.1608999999999994, 1e-12);
    near(a, stats.betaPdf(0.9, 5, 2), 1.9683000000000004, 1e-12);
    near(a, stats.betaPdf(0.5, 1, 1), 1, 1e-12);
    near(a, stats.betaPdf(0.25, 0.5, 0.5), 0.7351051938957226, 1e-12);
    near(a, stats.betaPdf(0.7, 10, 3), 2.3970042558000006, 1e-11);
    near(a, stats.betaPdf(0.5, 3, 7), 0.9843750000000003, 1e-12);
    near(a, stats.betaPdf(0, 1, 1), 1, 1e-12); near(a, stats.betaPdf(1, 1, 1), 1, 1e-12);
    a.equal(stats.betaPdf(0, 2, 2), 0); a.equal(stats.betaPdf(1, 2, 2), 0);
    a.equal(stats.betaPdf(0, 0.5, 2), Infinity, "a shape below 1 has a pole at that end");
    a.equal(stats.betaPdf(1, 2, 0.5), Infinity);
    a.equal(stats.betaPdf(-0.1, 2, 2), 0); a.equal(stats.betaPdf(1.1, 2, 2), 0);
    // Beta(1,1) is uniform, and every density integrates to 1 on [0, 1]
    [[2, 2], [2, 5], [10, 3], [1, 1], [3, 7]].forEach(function (c) {
      var area = 0, steps = 20000;
      for (var i = 0; i < steps; i++) area += stats.betaPdf((i + 0.5) / steps, c[0], c[1]) / steps;
      near(a, area, 1, 2e-4, "Beta(" + c[0] + ", " + c[1] + ") integrates to 1");
    });
  });
  // tp=prev*sens; fp=(1-prev)*(1-spec); ppv=tp/(tp+fp)
  test("diagnosticTest: Bayes' rule on a screening test", function (a) {
    var r = stats.diagnosticTest(0.01, 0.99, 0.95);
    near(a, r.ppv, 0.16666666666666655, 1e-12); near(a, r.npv, 0.9998936848819903, 1e-12);
    near(a, r.pPositive, 0.05940000000000004, 1e-12);
    near(a, r.truePositive, 0.0099, 1e-12); near(a, r.falsePositive, 0.049500000000000002, 1e-12);
    near(a, r.truePositive + r.falseNegative + r.falsePositive + r.trueNegative, 1, 1e-12, "the four cells are a probability table");
    near(a, r.pPositive + r.pNegative, 1, 1e-12);
    r = stats.diagnosticTest(0.001, 0.99, 0.99);
    near(a, r.ppv, 0.09016393442622944, 1e-12, "a rare disease makes most positives false");
    r = stats.diagnosticTest(0.1, 0.9, 0.9);
    near(a, r.ppv, 0.5000000000000001, 1e-12); near(a, r.npv, 0.9878048780487805, 1e-12);
    r = stats.diagnosticTest(0.5, 0.8, 0.7);
    near(a, r.ppv, 0.7272727272727273, 1e-12); near(a, r.npv, 0.7777777777777778, 1e-12);
    r = stats.diagnosticTest(0.02, 1, 0.9);
    near(a, r.ppv, 0.16949152542372883, 1e-12); a.equal(r.npv, 1, "a perfect sensitivity makes every negative a true negative");
    r = stats.diagnosticTest(0, 0.9, 1);
    a.ok(isNaN(r.ppv), "no positives can occur, so the predictive value is undefined rather than 0/0");
    a.equal(r.npv, 1);
  });

  /* ---- 4j. Resampling helpers (Phase 22) ------------------------------- */
  test("resample: draws with replacement from the array, and only from it", function (a) {
    stats.seed(4);
    var pool = [2, 4, 4, 4, 5, 5, 7, 9];
    var r = stats.resample(pool, 500);
    a.equal(r.length, 500);
    r.forEach(function (v) { a.ok(pool.indexOf(v) >= 0, "every draw comes from the pool"); });
    a.equal(stats.resample(pool).length, pool.length, "k defaults to the pool size");
    a.equal(stats.resample(pool, 0).length, 0);
    // with replacement, a large draw must repeat values far more than the pool allows
    var counts = {};
    r.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    a.ok(counts[2] > 20, "each value keeps reappearing: 2 drawn " + counts[2] + " times from a pool holding one");
    // the resample mean concentrates on the pool mean
    var means = [], i;
    for (i = 0; i < 4000; i++) means.push(stats.mean(stats.resample(pool)));
    near(a, stats.mean(means), stats.mean(pool), 0.05, "bootstrap means centre on the sample mean");
    // and their spread is the standard error of the pool mean, sd/sqrt(n) with the population sd
    near(a, stats.sd(means), stats.populationSd(pool) / Math.sqrt(pool.length), 0.06);
    a.ok(!(stats.resample(pool, 3) === pool), "returns a new array");
    stats.unseed();
  });
  // np.quantile(values, p, method="weibull") at (1-level)/2 and (1+level)/2
  test("percentileInterval: the middle share of the values, by the site's quantile rule", function (a) {
    var d = [2, 4, 4, 4, 5, 5, 7, 9];
    var r = stats.percentileInterval(d, 0.95);
    near(a, r.lo, 2); near(a, r.hi, 9); a.equal(r.level, 0.95);
    r = stats.percentileInterval(d, 0.9);
    near(a, r.lo, 2); near(a, r.hi, 9);
    var hundred = []; for (var i = 1; i <= 100; i++) hundred.push(i);
    r = stats.percentileInterval(hundred, 0.95);
    near(a, r.lo, 2.525); near(a, r.hi, 98.475);
    near(a, stats.percentileInterval(hundred, 0.5).lo, stats.quantile(hundred, 0.25), 1e-12);
    near(a, stats.percentileInterval(hundred, 0.5).hi, stats.quantile(hundred, 0.75), 1e-12);
    a.ok(isNaN(stats.percentileInterval([], 0.95).lo), "empty input gives NaN, not an error");
    a.equal(hundred[0], 1, "the input is not sorted in place");
  });

  /* ---- 4l. Two-predictor least squares (Phase 23) ---------------------- */
  // import numpy as np; X = np.column_stack([np.ones(n), x1, x2])
  // b, *_ = np.linalg.lstsq(X, np.array(y, float), rcond=None)
  test("twoPredictorFit: matches numpy's least-squares solution of the 3 × 3 system", function (a) {
    var x1 = [1, 2, 3, 4, 5, 6, 7, 8], x2 = [2, 1, 4, 3, 6, 5, 8, 7];
    var y = [3.1, 2.4, 5.9, 5.2, 8.8, 8.1, 11.7, 11.0];
    var f = stats.twoPredictorFit(x1, x2, y);
    near(a, f.b0, 0.5674999999999997, 1e-9); near(a, f.b1, 0.3675000000000005, 1e-9); near(a, f.b2, 1.0674999999999994, 1e-9);
    near(a, f.r2, 0.999928018715134, 1e-9); near(a, f.sse, 0.005999999999999841, 1e-9); a.equal(f.n, 8);
    // an exactly linear surface is reproduced to the last bit
    var e1 = [1, 2, 3, 4, 5, 1, 2, 3], e2 = [1, 1, 2, 2, 3, 3, 4, 4];
    var exact = e1.map(function (v, i) { return 4 - 2 * v + 3 * e2[i]; });
    var g = stats.twoPredictorFit(e1, e2, exact);
    near(a, g.b0, 4, 1e-9); near(a, g.b1, -2, 1e-9); near(a, g.b2, 3, 1e-9);
    near(a, g.sse, 0, 1e-16); near(a, g.r2, 1, 1e-12);
    // the fitted plane really minimises: nudging any coefficient makes SSE worse
    function sseAt(b0, b1, b2) {
      var total = 0;
      for (var i = 0; i < x1.length; i++) { var e = y[i] - (b0 + b1 * x1[i] + b2 * x2[i]); total += e * e; }
      return total;
    }
    near(a, sseAt(f.b0, f.b1, f.b2), f.sse, 1e-12);
    a.ok(sseAt(f.b0 + 0.05, f.b1, f.b2) > f.sse); a.ok(sseAt(f.b0, f.b1 + 0.05, f.b2) > f.sse); a.ok(sseAt(f.b0, f.b1, f.b2 + 0.05) > f.sse);
  });
  test("twoPredictorFit: a coefficient can flip sign once the partner is in the model; collinearity returns null", function (a) {
    // y = 1 − x1 + 2·x2 with x1 and x2 almost the same variable (r = 0.999)
    var x1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], x2 = [1.1, 2.0, 3.2, 3.9, 5.1, 6.0, 7.1, 7.9, 9.2, 10.0];
    var y = x1.map(function (v, i) { return 2 * x2[i] - v + 1; });
    var f = stats.twoPredictorFit(x1, x2, y);
    near(a, f.b0, 1, 1e-6); near(a, f.b1, -1, 1e-6); near(a, f.b2, 2, 1e-6);
    var alone = stats.linearRegression(x1, y);
    near(a, alone.slope, 0.993939, 1e-5, "on its own x1 looks positive");
    a.ok(f.b1 < 0 && alone.slope > 0, "and turns negative once x2 is held fixed");
    near(a, stats.correlation(x1, x2), 0.9993649867095981, 1e-9);
    // an exact copy of a predictor leaves the system singular
    a.equal(stats.twoPredictorFit(x1, x1.slice(), y), null, "identical predictors return null, not a divide by zero");
    a.equal(stats.twoPredictorFit([1, 2, 3], [2, 4, 6], [1, 2, 3]), null, "so does an exact multiple");
    a.equal(stats.twoPredictorFit([1, 1, 1, 1], [1, 2, 3, 4], [1, 2, 3, 4]), null, "so does a constant predictor");
  });

  /* ---- 5. RNG and samplers (seeded, distributional) ------------------- */
  var N = 100000;
  function drawStats(fn) {
    var w = stats.welford();
    for (var i = 0; i < N; i++) w.push(fn());
    return w;
  }

  test("seed: same seed gives the same sequence; unseed switches back", function (a) {
    stats.seed(123); var x1 = [stats.random(), stats.random(), stats.random()];
    stats.seed(123); var x2 = [stats.random(), stats.random(), stats.random()];
    a.equal(JSON.stringify(x1), JSON.stringify(x2));
    stats.seed(124); a.ok(stats.random() !== x1[0], "different seed differs");
    x1.forEach(function (u) { a.ok(u >= 0 && u < 1, "in [0,1)"); });
    stats.unseed(); var u = stats.random(); a.ok(u >= 0 && u < 1, "Math.random path in [0,1)");
  });
  // Truth: U(0,1) mean 1/2, var 1/12. SE(mean) = sqrt(1/12/1e5) ≈ 0.0009.
  test("random: 100k seeded draws have mean ≈ 1/2 and variance ≈ 1/12", function (a) {
    stats.seed(1); var w = drawStats(stats.random);
    a.close(w.mean, 0.5, 0.005); a.close(w.variance, 1 / 12, 0.002);
  });
  test("randomInt: covers every value in range and nothing else", function (a) {
    stats.seed(2); var seen = {};
    for (var i = 0; i < 6000; i++) seen[stats.randomInt(1, 6)] = (seen[stats.randomInt(1, 6)] || 0) + 1;
    a.equal(Object.keys(seen).sort().join(","), "1,2,3,4,5,6");
    for (var k in seen) a.ok(seen[k] > 700 && seen[k] < 1300, "face " + k + " roughly uniform, got " + seen[k]);
  });
  test("shuffle / sampleWithoutReplacement: permutation, no duplicates, input untouched", function (a) {
    stats.seed(3); var src = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var sh = stats.shuffle(src);
    a.equal(sh.slice().sort(function (x, y) { return x - y; }).join(","), src.join(","));
    a.equal(src.join(","), "1,2,3,4,5,6,7,8,9,10");
    var s = stats.sampleWithoutReplacement(src, 4);
    a.equal(s.length, 4);
    a.equal(new Set(s).size, 4);
    s.forEach(function (x) { a.ok(src.indexOf(x) >= 0, "sampled value is from source"); });
    a.equal(stats.sampleWithoutReplacement(src, 0).length, 0);
    a.equal(stats.sampleWithoutReplacement(src, 10).length, 10);
    // Each position is equally likely: first element of 12k samples of size 1 from {1,2,3}
    var counts = [0, 0, 0]; for (var i = 0; i < 12000; i++) counts[stats.sampleWithoutReplacement([1, 2, 3], 1)[0] - 1]++;
    counts.forEach(function (c) { a.ok(c > 3600 && c < 4400, "roughly uniform, got " + c); });
  });
  // Truth: U(a,b) mean (a+b)/2, var (b−a)²/12
  test("sampleUniform(2, 5): mean ≈ 3.5, variance ≈ 0.75", function (a) {
    stats.seed(4); var w = drawStats(function () { return stats.sampleUniform(2, 5); });
    a.close(w.mean, 3.5, 0.015); a.close(w.variance, 0.75, 0.02);
  });
  // Truth: Bernoulli(p) mean p, var p(1−p)
  test("sampleBernoulli(0.3): only 0/1, mean ≈ 0.3, variance ≈ 0.21", function (a) {
    stats.seed(5); var w = drawStats(function () { var x = stats.sampleBernoulli(0.3); a.ok(x === 0 || x === 1); return x; });
    a.close(w.mean, 0.3, 0.008); a.close(w.variance, 0.21, 0.008);
    a.equal(stats.sampleBernoulli(0), 0); a.equal(stats.sampleBernoulli(1), 1);
  });
  // Truth: Binomial(n,p) mean np, var np(1−p): (20, 0.3) → 6, 4.2
  test("sampleBinomial(20, 0.3): integer in [0,20], mean ≈ 6, variance ≈ 4.2", function (a) {
    stats.seed(6); var w = drawStats(function () { var x = stats.sampleBinomial(20, 0.3); a.ok(x >= 0 && x <= 20 && x === Math.floor(x)); return x; });
    a.close(w.mean, 6, 0.04); a.close(w.variance, 4.2, 0.1);
    a.equal(stats.sampleBinomial(0, 0.5), 0); a.equal(stats.sampleBinomial(7, 1), 7); a.equal(stats.sampleBinomial(7, 0), 0);
  });
  // Truth: Poisson(λ) mean λ, var λ — small λ (Knuth) and λ = 75 (chunked)
  test("samplePoisson(3.5) and (75): mean ≈ variance ≈ λ", function (a) {
    stats.seed(7); var w = drawStats(function () { return stats.samplePoisson(3.5); });
    a.close(w.mean, 3.5, 0.035); a.close(w.variance, 3.5, 0.1);
    stats.seed(8); var w2 = drawStats(function () { return stats.samplePoisson(75); });
    a.close(w2.mean, 75, 0.15); a.close(w2.variance, 75, 2);
    a.equal(stats.samplePoisson(0), 0);
  });
  // Truth: Exponential(rate) mean 1/rate, var 1/rate²: rate 2 → 0.5, 0.25
  test("sampleExponential(2): non-negative, mean ≈ 0.5, variance ≈ 0.25", function (a) {
    stats.seed(9); var w = drawStats(function () { var x = stats.sampleExponential(2); a.ok(x >= 0 && isFinite(x)); return x; });
    a.close(w.mean, 0.5, 0.01); a.close(w.variance, 0.25, 0.01);
  });
  // Truth: Normal(3, 2) mean 3, var 4; also check the empirical rule ≈ 68.27% within 1σ
  test("sampleNormal(3, 2): mean ≈ 3, variance ≈ 4, ≈68.3% within one σ", function (a) {
    stats.seed(10); var inside = 0;
    var w = drawStats(function () { var x = stats.sampleNormal(3, 2); if (Math.abs(x - 3) <= 2) inside++; return x; });
    a.close(w.mean, 3, 0.03); a.close(w.variance, 4, 0.1);
    a.close(inside / N, 0.6827, 0.008);
    a.equal(stats.sampleNormal(5, 0), 5);
    stats.seed(10); var first = stats.sampleNormal(); stats.seed(10); a.equal(stats.sampleNormal(), first, "seed resets the Box–Muller spare");
  });
  // Truth: loaded die above, E = 4.5, Var = 3.25
  test("sampleDiscrete: loaded die, mean ≈ 4.5, variance ≈ 3.25, only listed values", function (a) {
    var v = [1, 2, 3, 4, 5, 6], p = [0.1, 0.1, 0.1, 0.1, 0.1, 0.5];
    stats.seed(11); var w = drawStats(function () { var x = stats.sampleDiscrete(v, p); a.ok(v.indexOf(x) >= 0); return x; });
    a.close(w.mean, 4.5, 0.03); a.close(w.variance, 3.25, 0.1);
    a.equal(stats.sampleDiscrete(["only"], [1]), "only");
  });

  // Truth: Geometric(p) mean 1/p, var (1−p)/p²: p = 0.3 → 3.3333, 7.7778
  test("sampleGeometric(0.3): integer ≥ 1, mean ≈ 3.33, variance ≈ 7.78", function (a) {
    stats.seed(12); var w = drawStats(function () { var x = stats.sampleGeometric(0.3); a.ok(x >= 1 && x === Math.floor(x)); return x; });
    a.close(w.mean, 3.3333333333333335, 0.05); a.close(w.variance, 7.777777777777778, 0.5);
    a.equal(stats.sampleGeometric(1), 1);
  });
  // Truth: scipy hypergeom(50, 20, 10).mean() = 4.0, .var() = 1.9591836734693877
  test("sampleHypergeometric(50, 20, 10): 0..10, mean ≈ 4, variance ≈ 1.96", function (a) {
    stats.seed(13); var w = drawStats(function () { var x = stats.sampleHypergeometric(50, 20, 10); a.ok(x >= 0 && x <= 10 && x === Math.floor(x)); return x; });
    a.close(w.mean, 4, 0.03); a.close(w.variance, 1.9591836734693877, 0.06);
    a.equal(stats.sampleHypergeometric(10, 10, 3), 3); a.equal(stats.sampleHypergeometric(10, 0, 3), 0); a.equal(stats.sampleHypergeometric(10, 4, 0), 0);
  });

  /* ---- 6. Argument guards --------------------------------------------- */
  test("invalid arguments throw RangeError", function (a) {
    [
      function () { stats.sampleBernoulli(1.5); },
      function () { stats.sampleBinomial(-1, 0.5); },
      function () { stats.samplePoisson(-2); },
      function () { stats.sampleExponential(0); },
      function () { stats.sampleUniform(3, 3); },
      function () { stats.normalPdf(0, 0, 0); },
      function () { stats.quantile([1, 2], 1.5); },
      function () { stats.sampleWithoutReplacement([1, 2], 3); },
      function () { stats.expectation([1, 2], [0.5, 0.6]); },
      function () { stats.logFactorial(2.5); },
      function () { stats.seed(0.5); },
      function () { stats.sampleGeometric(0); },
      function () { stats.hypergeometricPmf(1, 10, 11, 3); },
      function () { stats.sampleHypergeometric(10, 3, 11); },
      function () { stats.logGamma(0); },
      function () { stats.incompleteBeta(1.5, 2, 2); },
      function () { stats.tQuantile(1, 5); },
      function () { stats.normalQuantile(0); },
      function () { stats.welchTest([1], [1, 2]); },
      function () { stats.pairedTest([1, 2], [1, 2, 3]); },
      function () { stats.twoProportionTest(5, 4, 1, 10); },
      function () { stats.incompleteGamma(0, 1); },
      function () { stats.chiSquareGof([1, 2], [0.5, 0.6]); },
      function () { stats.chiSquareIndependence([[1, 2], [3]]); },
      function () { stats.correlation([1, 2], [1]); },
      function () { stats.linearRegression([2, 2, 2], [1, 2, 3]); },
      function () { stats.sumSquaredResiduals([1], [1], 0, 1); },
      function () { stats.fPdf(1, 0, 5); },
      function () { stats.fCdf(1, 3, -1); },
      function () { stats.fQuantile(1, 3, 12); },
      function () { stats.anovaTest([[1, 2, 3]]); },
      function () { stats.anovaTest([[1, 2], []]); },
      function () { stats.anovaTest([[1], [2]]); },
      function () { stats.permutations(2.5, 1); },
      function () { stats.permutations(-1, 0); },
      function () { stats.betaPdf(0.5, 0, 2); },
      function () { stats.betaPdf(0.5, 2, -1); },
      function () { stats.diagnosticTest(1.5, 0.9, 0.9); },
      function () { stats.diagnosticTest(0.1, 2, 0.9); },
      function () { stats.resample([], 3); },
      function () { stats.resample([1, 2], -1); },
      function () { stats.percentileInterval([1, 2], 0); },
      function () { stats.percentileInterval([1, 2], 1); },
      function () { stats.twoPredictorFit([1, 2], [1, 2], [1, 2]); },
      function () { stats.twoPredictorFit([1, 2, 3], [1, 2], [1, 2, 3]); }
    ].forEach(function (fn, i) {
      var threw = false;
      try { fn(); } catch (e) { threw = e instanceof RangeError; }
      a.ok(threw, "guard " + i + " should throw RangeError");
    });
    stats.unseed();
  });
})();
