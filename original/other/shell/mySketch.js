
// enable to see the underlying circles
const debug = false;
const debugPoints = false;
const doRemoveOfTestBranch = true; 

const R_SEED = 0; 

// let artWidth = Math.ceil(window.innerWidth)
// let artHeight = Math.ceil(window.innerHeight);

const artWidth = 1500
const artHeight = 1500

// possibly 2x what we actually say here on high DPI
// because of pixelDensity()
const renderMultiplier = 1
const backgroundColor = '#ebe0d3'

// my circle packing library
// (width, height, numberOfSections, padding)
// you can change the padding
// numberOfSections is how many boxes to cut the screen up into both x and y for optimization
// normally I use something like 15, but more worked better here
const PACKER_PADDING = 2
const packer = new CirclePacker(artWidth, artHeight, Math.round(Math.max(artWidth, artHeight) / 1600 * 200), PACKER_PADDING);
const poissonPacker = new CirclePacker(artWidth, artHeight, Math.round(Math.max(artWidth, artHeight) / 1600 * 100), 1);

// change these to change the number of items and their scale
const MIN_SCALE = 5
const MAX_SCALE = 1000
const SCALE_INCREMENT = 5
const SCALE_MAX_IMAGE = true
const NUM_ITEM_PLACE_TRIES_PER_FRAME = 20000
const NUM_ITEM_PLACE_TRIES_TOTAL = 20000
const NUM_POINT_TRIES = 5

const MAX_IMAGE_SCALE = 1

// holds the data about the geomety of shapes ie bananas etc
const Shape = function(type) {
	this.original = []
  this.circles = []
	
	this.fromArray = (arr, scale=1) => {
		
		// sorting order doesn't seem to matter which is weird
		// sort big to small
		arr.sort((a, b) => b[2] - a[2])
		// sort small to big
		// arr.sort((a, b) => a[2] - b[2])
		
		this.original = arr.map(c => ({x:c[0], y:c[1], r:c[2]*scale}))
		this.circles = this.original.map(c => ({...c}))
	}
  
	// takes the original data and transforms it
  this.scaleRotateTranslate = (scale, rotateRadians, translateX, translateY) => {
    this.circles = []
    this.original.forEach(c => {
      const x = c.x * scale
      const y = c.y * scale
      const r = c.r * scale
      // rotate and translate each x and y
      const x2 = x * cos(rotateRadians) - y * sin(rotateRadians) + translateX
      const y2 = x * sin(rotateRadians) + y * cos(rotateRadians) + translateY

      this.circles.push({x:x2, y:y2, r})
    })
	}
	
	this.fromString = (str) => {
		let out = str
		out = out.split(/(.{2})/).filter(_ => _.length === 2)
		out = out.map(n => parseFloat((parseInt(n, 36) / 1000 - 0.5).toFixed(3)))
		const outA = []
		while(out.length) outA.push(out.splice(0,3))
		return outA
	}
	
	if (type) {
		if (typeof type === 'string') {
			type = this.fromString(type)
		}
		// set circles [x, y, radius]
		// these are created in illustrator (drawn over images), exported as SVG, and then processed to be 0->1
		// the data being between 0->1 means you can scale to get X pixels size
		if (Array.isArray(type)) {
			this.fromArray(type)
		}
	}
}

// final circles that have been added
const circles = []
// final images to draw
const images = []

// for lookup
let shapes = [
	// food
  { src: 'shell1.webp', col: '#ffda7c', shape: new Shape('dtadksdbhfj4dtmqhfdb3afx8iewezidfoezdkq9ezfc3jeqjm6keqaalqeqfcq0eqba3senh3l8endk19ehj45tehk47ceh7rdwehimgxehkm8uee806kebkd83ebjdeneb80fxebhlkgebg3piebcaq0ebaj41e8jme5e8jdf5e87rgfe89il8e8dk0ie5ct19e5im52e58962e57i6te579cne580goe580hfe5imhoe599kze5hclze5aamze5ekqse5') },
  { src: 'shell2.webp', col: '#ffda7c', shape: new Shape('dvb2l7dvigjeeunugxec3pfvjr6nfa7p75f48pg8f4gb46f1kh7vf1j0g8f1bnnmf1ftqtev6q8meshs4xepkz93epbwouepec1henc53yekhsmdekcdptekij5feh7pf0eh8ghgehj9hgehcvqbeh875web8p5webk0f0ebafmvebhsn4ebel0re8f31qe86h9le86ha3e8l8a3e8k0fie87yi7e8ialwe8gtqbe8ddqte8ec0ie5dm1qe5fc1ze5be46e59x4xe5965fe56h7me578e9e5jii7e5iskwe5ijlee59xmde5h2q2e5dvqte5') },
  { src: 'shell3.webp', col: '#ffda7c', shape: new Shape('e3a5lre3i4jcetnkh5eg26fc8nfyfc7766ezjifyez6h7mevky66eq8nhreqbjn7eqgmqgeqf6qteq7x53eilo6weilo7meijiheeiet0qedk853ed77e5ed7kevede3qtedg92je9jv4qe9648pe964aie9kleve9') },
  { src: 'shell4.webp', col: '#ffda7c', shape: new Shape('df93lidpgsjvdzmuhxkl62fq6u58f6j7ebf37xelf3hul6f0cw1eeql57zemk1cxem9vlgemccqoemdz1eejjh4eejl58tej74dhej7ofyejd6qyejdzqyej606ced606wed9vmaedi4maedbs1ee9bi1ne97o3ve9klbue9jrfee97ogse9iokde99bkwe9fdqoe9etqye9c214e67x3le66u3ve6l59ne6kvb0e66kcee6klcee68rkne6i4mue69vnee6fxqee6') },
  { src: 'shell5.webp', col: '#ffda7c', shape: new Shape('e1asmtefjyj3e1p4fw99icfmgfp4fm6u57fhl757fhjmhyfh626sf3ef1leym06sey8140etk040etktgret7nh5etfm20ek59d6ek99kcekh82eef597zef598sefi0nxefbnocefc1oqefd81lea9937eait37ea595leak0jjeajmkceaaunxeabnp4eafmqqead8r4eagtr4ea') },
  { src: 'shell6.webp', col: '#ffda7c', shape: new Shape('ds8tktdsfxixe7kyheefoig7jg4tfn854tffkh6aey8zdteyef1wev7b6aetimdtetemqteti73deqanjwel963kejhkj9ej85cseg8revegitevegc4nvegdd1weefo23eegq2iee9t35eekp7ceejgcseeef0ue9hc2qe96v74e9kp7ye98rfie9itfie9a1j9e9hrjwe9ankqe9bpnge9gqnge9cr1we66o5ge66v7je66v7ye67qc5e67xe1e685eoe68zhee6i7ife69lj2e6anl5e6gqnve6ef0fe47q35e48535e48k35e46v8ee4kp8ee46v90e47ibqe4jgdee48rg4e4anlse4b2n1e4c4ope4fwqee4ddqle4foqle4dlqte4') },
  { src: 'shell7.webp', col: '#ffda7c', shape: new Shape('dra8ltdridj7e1nsh7ec1tflko6bfb8cg9f3gg2pewivgkewaqmvescj24ephn3beplk7jeplk8fepik3xeljr4tel6j6xel7ff2el8chrelhdm9elbn2fee5x8qeejrfneefkqseedgr3eeecr3eeeyr3eeb12pea5x7uea6te5ea6jegeak2f2ea7fh5eaj6hrea9ulzeahdn6ea5m84e75m9ce7lv9ce76jdje78cine78cjke79jloe7ggq6e7g5qhe7') },
  { src: 'shell8.webp', col: '#ffda7c', shape: new Shape('dpajmmekjcjsekpbg9jygsfi8lhnfidp1pfbh4orfble69f16b5perbq20enly7eenc0orenguq6enca1fek5q6jekm889ekleesek76giek8ljcekf41fedfp20edav2aed5g7oedkjiiedijnwedb5o6ed6v4ueakt54ea568jeamj9eea6lfnealefneadz0ae6aa2ae6a02ke6k94ke6kj4ue6mj9ye6mjaje6kjj2e68lk7e6ijohe6g9r1e6') },
  { src: 'shell9.webp', col: '#ffda7c', shape: new Shape('do97kgd6fvj6d6l8hhdfotg1e72kf08b54exj25dexiae2exe7querjt65eok27oeo8bd1eo9ljyele71aeh934ceh7t65ehgrjyehfho1eheyqceh7tcaebj2d1eb82dteb82ebebijf3ebfh2te8i143e8ia4ce8kc6we87a7fe8kc8ge8ijfle893jfe89lkpe8grkpe8b4oae8e70ie5co2ke5hi3ue57a6we5kc8ye58tixe5hiixe5h9jfe58tjpe5avo1e5fhpke5d6r3e5') },
  { src: 'shell10.webp', col: '#ffda7c', shape: new Shape('dl9cm0e1hjjdeqn0hjkf4sfqlc6efc6r4sf98tfyf6g3qff16365eyjaf9eydtqneyb3mbewi5l6eteyqnetd515en7o3nelj237eiid2qef8d2zef5m7aefls7zefk7e4ef7getefjigeef8lhbefa6leefidm3efh8pqefcgpyefls8neajih3eaiukaeac01de7kndge78li0e7idmse7b3nge7hppae7e115e4jq2ze45e59e4m959e45e7ze45e8fe4ls94e46ze4e47gfhe4jihre48di8e48lioe4j2jte49qkye4idn8e4bjote4hxote4c0pie4coqne4') },
  { src: 'shell11.webp', col: '#ffda7c', shape: new Shape('dt8qltdtgtjpdzmmhk774dfwkr4ufscuq6fc8bejf7egqcf7jbejez6865evlk6methjlbepaflnepfrpuepdh0tel8h2rel6274eljh32ejlq7lej7ddfej80fuejk4dkef9mkuedbkpdedeb0tec9g24ec7u2feciz2leclq8eeckfd3ecjmfoecco0tea5w7xealq8wea6vclea80gneahpm5eagkpdeac10ze6594ue65f5ce65w8ee6jmg5e6i6koe6a9mge6hpmme6bvrbe6i624e45w2re45q2xe4le32e4mj5ie4md5ze45w8we4lq9de4krcle480h4e4gwove4beqhe4fxqne4frqte4flqze4es0te2al1ge2a91me29s1se2622le2lw38e25f3ee2593we25w9je26jbye2kxcae277f7e27dfoe2jmghe28zk1e294kde29mlhe2a9mse2hpmye2awoqe2b2ove2bepue2') },
  { src: 'shell12.webp', col: '#ffda7c', shape: new Shape('dqa2midvipj7ennzh7l55kgm6l54gh5d7ff68rh6f6izh0f5m887f1ja3eevb8ncev8m33etd31eeojwg3eod3qweoic2sem528tek7og8ekhqmfek9e2heimd9geibeoleicb1kefjai9efcbqgef529led8gikedc0pzedn57febkifhebabmqebbkp7ebfvr2ebd90me9dv19e9a026e9hl2be9k72ye94a6ce952a7e9mda7e972fme9jaive9i7lte9gnqle9f9r8e9ec1ee5be1pe5ax1ve5ah20e57d2ne57o2ne5mdaoe5kzepe5kuf0e56rf5e5j4jhe5a0mfe5hwn7e5gcqwe5bp1ke3nm4ce33z5qe3445we34g8de34g94e34l9re38gj6e38mjhe3iilce3bkpoe3dvr8e3b31ke28r26e26l2he24a3qe2n53qe2nb3ve2ng41e2nr4ne2446te2ng74e252aoe2mdaze2m8bge2lae8e26gepe27dgve2k7gve280i9e2j4jse2iol1e2asoae2hapze2h4qae2bpqge2') },
  { src: 'shell13.webp', col: '#ffda7c', shape: new Shape('dx8mjvdperikdpjohcdgn4g7dgpkfjjc5wf48j5wf1ef2gey99cjevi4d1evim4oekaii7ekgwi7ekef18ehi446eh994oeh8175eh8jbbehe6r1ehcg2peefn2pebhd3pebju75eb8aalebiuc2eb90djebide0eb9rhyebb8m4ebfwmdebf6ouebd7raebeo0ie88j4oe87s7ve87s8de8819ue88acae88jdae8hdhpe8ffoce8g52ye5gn37e59r46e57j6ne590e0e590eie5ideie590f9e5a9ixe5h5ixe5fwmve5fnnue5bhoue5f6pce5exqbe5cpr1e5') },
  { src: 'shell14.webp', col: '#ffda7c', shape: new Shape('dsbemudekkjw6s5ifhds27fdauq2fd7ji0f4jaiqf4lu7cf0evqgf08n41evl469evm88gevfzq2evby2ler5p6zermy96em4y9kemfm2leiah2yei6fgjeikdhmeih3pceidsqteie50qee9d3bee5c4see5c83ee76jgeekd55e94y8ge96fh9e9jnk7e99dpce9d1qte9') },
  { src: 'shell15.webp', col: '#ffda7c', shape: new Shape('dqajldd2i4j2d2neheee2zg3kb6xffgp3mf7io4yf784fhf0icghf0kz8keseeqoesc32zeoichseod2r0eojz5aeg6t7leg75e6egjcfheggpm2egeq0oecar3mec756xec6h88eclb9kec6teuec7tgtec9gm2ecbrqoecgd1ze8ic3me8a43ye86598e8ln98e86tdie87hh5e87thge8icise894lre89gnee8fdqde8c3r0e8') },
  { src: 'shell16.webp', col: '#ffda7c', shape: new Shape('dn8hl5dnfvjodalrhydnptfm7r42fdka56fdbgpgfd705jf484daeve014erf414erj6daerhckner8v2yei98jxeifipgeij63peelr5jeel16nee7dc6ee8vj6ee98kneebtqxeecx14e9g81he9gl1ue99y28e9hc28e9jk3be9lr4te9l17de9jxc6e97reee9g8ope9c6rae9') },
  { src: 'shell17.webp', col: '#ffda7c', shape: new Shape('e0cbkqe0jtiwep5hgve0pafy98hrfhe022f1kubmf1ishrf1g2olf176a9et76bmet76czetbyoletba5heli465elis6uelk58wel7vfqel') },
  { src: 'shell18.webp', col: '#ffda7c', shape: new Shape('e599kse5gejdeum3h8fkpnfse525fkl96ffb707uf3ju4zeu7q6feu7099eu8fdjeubaldeu7qc4emjudjemakkoem') },
  { src: 'shell19.webp', col: '#ffda7c', shape: new Shape('dtbzmvebkyi2et30fwdtpgfwgt3if2itjhf2ls7heqma8zeqmsaheq9tkheqftoyeqfb10ek4u9zek4uazek8tjhekbtogekcb30ee5c8zeemsbheebbnyeeftpyeefbqyee') },
  { src: 'shell20.webp', col: '#ffda7c', shape: new Shape('dna4l6dnhxj3dnndh0jv68fpef2cf7fz34f7hj3wex7e68ex6m7sexgrmlex86fleoj3fleoajo5eoefqheo') },
  { src: 'shell21.webp', col: '#ffda7c', shape: new Shape('e0aplidbijj4e0o8gre02vg18bgefk66e9f3gv3keu6699eugvmteu6w7ueml57uemlu99em66apemj0h3emb6niemgvoxemg5qdem') },
  { src: 'shell22.webp', col: '#ffda7c', shape: new Shape('dt8qkxe2g0jeeblkhuebpofx7r4ufik45lffd31pf18qdteyafk4evghoyevj544ep716bepj5dcepi6jvepbv1yem973eemku71emeb1pegb526ega62oegku80eg80cueg8hf1eg9pjeegbvoqegif3eeb6s7aebjvcdebioj5ebifkuebhgnzebk43we86b5le86s7re8ku8ze8k4bve8jeebe88hfre8a6l3e8iflbe8c4pge88h35e5ku9ge57ibve5jvcue5jme2e58hg8e597ioe5iwioe5hgohe5ghq6e5g8qfe5') },
  { src: 'shell23.webp', col: '#ffda7c', shape: new Shape('dwagkveghejtemnghzc93ogj9o4rfuhq4lfmf03hf88rf7f4jreaf2ihltf08868etc2qrer9o2remj75iemk4fkem8lghemallzemgg3beikbd7ei7udxeijk68eg7o75egcf0xee8y2xeejekpeecz14ebeg27ebjy6zeb7h7peb7hd7ebkbgbebiumwebbcq0ebh02xe77oene78eh8e7a2lfe7csrae7d6rae79527e5746ze5koc3e5kocge57beae5afmqe5iunge5fdrhe5cm0de3dp1he38y2ee3kb7pe3748fe3748se374c3e374cge3kof1e3khgve388hle3jrk5e3a8mwe3afnge3azpae3g3rae3emroe3') },
  { src: 'shell24.webp', col: '#ffda7c', shape: new Shape('e28xkddqfijpdqldijc4ptfsef2bfkfopnfi8kchf7e2q0f7j2d6ewge2veqij43eqaioreo80b8emicj2em99jfemi6jsemcn2iehj84zehjlcaeh80dqeh9g4aefh3olef8x4zedjfe9edfbr9edef0jebha37ebht3keb8k5jebjl5jeb8qijeb93k4ebfvr9ebg71ze7bx2oe78x4ge77o9ze77oace77uefe77uese7ivice7ickhe793koe79tnve7ey0qe5a53re57u6se5jybre5jlese5j2hte5ickue59tp4e5hap4e59zpne5jy62e2k4b8e27uf5e2jlf5e293l0e29to8e2a5phe2haphe2acqje2') },
  { src: 'shell25.webp', col: '#ffda7c', shape: new Shape('e0awkue9huj8exn5hjiv5sgi8x61gibh4egde01vfah13pfakh7vez7j8cezcm23etfn2betjcfiet95fzetdsqmetg3qmeoepqveokq91elb8m8elds39eiinkueiifljeih1q6eigs2bef6u4eefk1edef8gfaefjkggef8xgwefif30ea6d53ealf53ea729ieaky9qeajkhdeacvq6eaj430e77b3ye7ky46e7l74ee7655ke7ln5ke7lf6he76l7fe7729ye7kya7e788g7e78xhle7j4k5e7ajlre7inm8e7dj0he4bp1ve49d30e4ex30e49539e4lf4ne46d6qe4lf6ye472afe4kyane480ede4jcjge4ablje4b8n5e4hqppe4') },
  
	{ src: 'star1.webp', col: '#ffda7c', shape: new Shape('dwf3j9do9ogkhdj7gkj4dcgdanjfgd7td5gaiollg7do67g2m5c2g294leg250c2g081ncfudo3tfpojarfpjznkfp2ub6fh6qp2fhl2p2fhq99vf7do1uf41bajezlhe8ej9sbmeh8hfjehfn7iee6qareejrazee5ne8eejbfyeemdq5ee5nqdeelpqlee5vnkecbq7ae9bq7pe9p690e9ms9ve9obcpe931cxe96ylle9balte98hpae9cd2ie6qh8le6qx8le6md9ve644a3e613bme6mde8e6j4gme6j4h1e6a7nce69znke657pqe663qte66iqte6ez22e4ez2ie4ff4oe4r58se4rc90e4ng98e4269oe46babe4keaje47eare49cb6e4qhb6e44ke8e4l2eve48wh9e48ohxe489ice481jfe46ille4galte4l2lte463n4e4i8o7e4l2qte4') },
	{ src: 'star2.webp', col: '#ffda7c', shape: new Shape('dyfkgmds9xfelfc8fe65ckfejld2fe7nd8fe9bdwfehxdwfeg4i1fehajjfeamjvfeds83fadsbkfaasekfacghvfai9kpfa9hl1fa8hm1fan9bef84nbwf8j3lvf8ds5xf6ggeef6k3mvf67hn1f6kxnvf6ds4ff436b8f46ho1f4p2akf0lrp0f05hp0ewdy2yeuq89xeu1oakeudacweumfq0eudy1seoc4jdeo4npuememcwekb4idek0oa3egn9qoegdy0yeeem6xeer29feecy6xecnxa9ecokbkecr89xeamxcqea4bqieam3aqe68zcee6fmdee6l3dqe6hafee6emi7e6hrm1e63zq6e6mrr0e6cy3ge4es3le4cm8xe4ey8xe42ia3e4lraqe4q8awe4jxbke47hbqe4jfeke49nfee4abfwe4jrkpe4cm6le2cm79e2rk9le2169re22o9xe2nl9xe24bafe20oaqe25tb2e2i3cee2gmd2e24bd8e26be2e27zeqe2hlfee29hfke2gsfqe2b4g2e2bag8e2dside2irjde2fsjpe2c4k7e2gsl1e2aylde2aslje29zmde29tmje2mxp6e26hpce2nfq0e2') },
	{ src: 'star3.webp', col: '#ffda7c', shape: new Shape('e2cmmkjd5ph65leqh6mbfjh6djldh68r5ggq7632fo2efjfophglfoli32fldjotfl6n7keln3ccel37h4elkpigeladkkelgzkuel5u1qeibf44eigg44ei5larei2edoeipheqei0tgcei6dhxei76hxeigzlneifeoaeilr83ec6d8decofi6ec9kk1echskkecbooaecmk1qe9k620e9jx29e9912je9mk4ee9mk4xe96496e94sbke9mubke9r3hee93qhne9liiqe9k6ize991jse9boote9mb1he6mu20e65b29e6mu44e652bae6rcgve624hee64shxe6oyige67piqe6jxj9e6') },
	{ src: 'star4.webp', col: '#ffda7c', shape: new Shape('duf7kf9xkmh76xcsh4k6d3h4i2kbh4du8lgwk6n1ge8fnmgedu5agbnhc7gb3mbwg7lzoufpdu2kflpvbafe6xpqfe17baf3n6elel78g3el7uhwelg96hee1ta3ee54a3eeooa3eeq6cseeldkmee6mlteefn36eag95keagu96ea2f9sea9caeeapldeeakggeea7jh0ead9ltea8fqcean6qceam9qmeamvqmeadj0re7fy42e7g94ze7bg6he7gk73e7gu8ae7au96e7lda3e7lza3e7reaze73meae748ele7o2ele7k6h0e7k6hme76ml8e7lzl8e7f2lte7cym4e7mvn1e7bgnme7hrnxe75qoje7k6pqe7nhq1e7loqme76mr8e7') },
	{ src: 'star5.webp', col: '#ffda7c', shape: new Shape('dsevlldh6uh3l6cmh063cxh09bl9gwial9gw2wbzg17pnug1k7nug1odbzfxdh30fplhprf6qmbney6fpreyc6mkerbv3yenf23yengo7hen0zb0enfemken5sosen7da2efpzapefqacxef37e8efo1e8eflhftefkiipeflhlwefd5mkefa97hebjk9qeb0nbzeb63g5ebe4mkebmgoseb7pq2ebgo6je89m84e8809qe83ua2e84ia2e872ipe8kujoe8mgo5e855pre8k7q2e8mrq2e8') },
	{ src: 'star6.webp', col: '#ffda7c', shape: new Shape('dqchlul8f2h6dqkih3j560gu68f2gu8t60gqolgdg83dfufvl835fsdqnvfs703ofm5y24f31bgdf0dqpxexqxgvergb4zeokp8leom01celms1veibe4peim04zeilrbpei1theei7shweijfi6eimji6eiadjqeih3jqeierpoeij52wec6q8lecocdrec70hwecqehwecfsn3ec8j2we85y58e86q82e8791ve5jf2de59235e5hc3oe5fj4ge55pbye55gc7e53ddre5oue1e5qxfue509gve54ehne58aife5k7ife5kpife5nbife5iwioe5idiye5bemte5fsnle5fap5e5') },
	{ src: 'star7.webp', col: '#ffda7c', shape: new Shape('dpj9godxerg5hbjpg2akjhfzjsjpfz7njpfxdxc2fm4qjpfjm0jpfjdxa9f62pjpf6ntjpf6p6jxf0f2gsevdx88escdgkes14jpenqijxene57ceiem8xefficyefinhwef5ul1ef8zl9efdx6oe9cdcye962ice91lkde9lcl9e9inlie9e568e7d995e7boeje78rhwe73dkte7nll1e7bol9e7fql9e7faaye4fydee4fyfve4lci4e43dike4rfjxe4n5l1e4mpl9e49olie4b8lie4fylie4') },
	{ src: 'star8.webp', col: '#ffda7c', shape: new Shape('g4jlgzfvemgfa6kag9j6k2g6lkk2g4fvc0g17lkag1cskag1nxkafv4zkafnfv9nfhfv7qf3eggqf32uk2f3q2kjf3fn6keu1fk2eohjgqemfv5mejmqlyegfvmnegegacea0hk2ear8krea3bl8eaklm6eabdmfeaglmneaeo8ge7haace7difke7i0g1e7ngi5e7n7iee766ime7ptjce7pclpe7egm6e7hrm6e7k4m6e7bumfe7cbmfe7f5mne7gc55e5eo7ze5dqche5dicye5dqd6e5didne5bdi5e5bui5e55xiee53bive5pkj4e50qjle5r8kae52ml8e5ptlpe55plye566lye58jmfe590mfe5d1mfe5eomfe5hjmfe5lbmfe5') },
	{ src: 'star9.webp', col: '#ffda7c', shape: new Shape('f1cgm36ufch9k25uh5mpfcgza05ugwfbkngw863gg33egeg0fbntg0m636fxpmgefef1pxf86u1lf4n91cey8yi0ey1agyepkvi9epn9c6elirjuelc5k4elh548eicx4iei7w87ei6ubxei1khqeiouhqeiqfhqei4gi9eik2j2eigdpoeio124ec612necn951ecmg87ecmg8qecpmeaecpwetecihkneccxmiecd7n1ecesr9ecfbr9ec6u5ae93oe1e9qyh7e923i9e99rise9jjjle9m612e6gd3ze66u5ue66uaue6n9bee6o1cge635eae6r7gye63oije659ije6bcjue6c5kwe6celfe6hfn1e6d7nke6dqpee6gdqge6') },
	{ src: 'star10.webp', col: '#ffda7c', shape: new Shape('eaeplolqcfhditl7hd6hcfh5el6xh19qligx39bsgakrofgael3ofypbbgfy7so4fyel1fercnmher6hpqerbd79en66foenf9mhenfk1qefno9ief0zatef0nbgefozdqefm2g0eflehyef7gilef7gj9efdmmhef75qdefmdqdeflqqpefdm1qeccc4nec8g97ecob97ec1m9uecleileci6orecdb22e8hu7ke8js97e8849ie8ql9ue8qxa6e80cate80nc4e8lqgze875jwe86hmhe8fwn5e8hiore85up3e8') },
	{ src: 'star11.webp', col: '#ffda7c', shape: new Shape('etewke8fd3h5et88gxirk3gxl7csguavk3guf456gckamtgc91mig8o8bkg44hbvg4et2rfqlioyfq7iocfm2cayfb6apvewq2a1epf40xem6aacemnxe0emhun4emco5seehu8ueeqoanee5debeel7g4eeg1lleejop9eel7qseeltqseegn31ebcz3yebjda1eb21cheb8fgfebltkpebdllaebbgn4ebmqnfeb7iq6ebg118e7gc1je7cz3ce7gx3ce7co4ve7hj5he7399qe75d9qe7l79qe7jza1e7mfa1e7qob9e74sebe78qhce7kwhce78qhye75ooce75ooye79coye7j2oye75dp9e791p9e7n0q6e7mqqhe7mfqse7') },
	{ src: 'star12.webp', col: '#ffda7c', shape: new Shape('dncrmddwleh7lrfdh4iv5ygy8n5ogv5ifdgs2mfwfwdnotfw6t32ftkz32ftowg6ftk6i9erqqgyeofz4del4zciel6ti0elba44ei6k81eikz8bei0jg6ei0sgyeiq7hqeihkkdei6118eciv2tecc24decey4declr4wecm0bgecmabzec0jfdecr0g6ec1bhhecjej2ecivjkeca8kmecfqoaeclr18e9591re9mj1re9gi3ue95s4we92wdte93ohqe9nui0e97cije9ahl5e9hbl5e9bjnre9fqote9eyqee9eoqne95i1he5ma1he54z20e5j520e5mt20e5ic2te559bge535dje5owe2e5r0fne5rjgfe5nci9e5icjue5f7q4e5') },
	{ src: 'star13.webp', col: '#ffda7c', shape: new Shape('e3g3gkdxaofh8udsfhdr91ff6qctffdr6xfdlgcbfdjtd4fdicdyfdabegfdgverfdbyijfdg2ivfdazjofdh1k0fda0kufdi6kzfd8ulzfdj6m5fd7vn4fdkbnafd4xbzf9dl4sf7n9bcf7dxcbf7lgo9f5okaof33gbcf36qo9f3dl3bez5wp9ezmap9ex25aoevbsemevdl1uetpva1etn3pwetbbflep53q2ep15a6emd9dgemqp9jek87cbeeeqdgeecm7wec77eaec4fqqecnrqqeccm5rea68bceamxcneabbgke8cs2be6eq5fe6ew7we60c9ve6lsaue6ladse6knlte6df0ue4dr0ue4cm3te4el3te4eq5re4rc9de4p29je41t9pe40ca6e4m4aoe4cmbne4jzbne4i0che459dge4jnere47jexe4ahfxe4dfipe4efive4elj1e49ijce4iijie4jnkoe4hpmge4mro9e481ole44xqwe4n9r1e4ef2he2cm2ne2ca69e2ri9je2rc9pe2cg9ve2nfa1e25wb0e2k5bie2f8bne2cmbze28oc5e2f2cze25edme2bmdme2cgdse2jzeme287f9e2iiffe2a0fxe2bhgwe2gplhe2abmbe2lsmye2iunme25eo9e2mxofe27vore2k5ore24rp9e243q8e25wqee24rr1e2') },
	{ src: 'star14.webp', col: '#ffda7c', shape: new Shape('dqf9jb8gdlgndq9sgkjmddgiacjpgdh3jpgddq6ug5mdcbg55hcjg5ikltg58vm0fx3ebhfvjunpfvdq43fsohbhfn7lnpfnkwpefi6jp6fbdq1zf81hamf8q6amf35pqgellyqneglbr3eghqbheelyenee5xeueekwltee5apteej0aueb5pniebdx0ie9cg2me9ez2me9c155e9fe55e9fu83e9qtboe9q6c3e988gbe9jmjhe97tk4e9b7m0e9lyo4e9mdq8e96jqne9bm83e6p49se652a7e6n7a7e6rfame6k9aue69xb9e6o9dle6j7g4e67tjpe67ekce66rlte6g9m0e6ljmne6hqnxe6j0pme6kor3e6di0ie4d30pe4ec0pe4ek0xe4bt5ke4fm5ke4fu7oe42j9de42r9ke4pj9ke4aza7e46rame47eaue41ac3e4ohdde43ldse4nne7e46cfhe4ishte47tjae4jujwe4eskre4kokye46jm8e4lqmge45xn2e4hbnpe49io4e488pee47tpte476qge4k2qve4') },
	
	{ src: 'worm1.webp', col: '#ffda7c', shape: new Shape('bl6bf6c37jf5ca3if4br4tf4cz8hf4du9df4edarf4bxemf2cggjf1e7bzf0d81rezczhlezdicvewcqdnewcwiqeubembeucdkaeqb8npeqbul6epbboleobrppeoctqlelgqq2ejdiqyejblfrehczjoehe7r4ehh9ooegh3pdegf6r1egh3nmefg7qieffsquefdo0peec72aeegkmueedf2wecg1meecapn0ecf6m1ebegm4ebc3qieac7jfe9flm4e9e1mbe9domke9h0n3e9h0o5e9am5ce6hfo2e6ctfee5dfmue5bxn3e5dcn6e5cjpwe5eqrde5as7ce4brdee4dride4b2lfe4e718e3b23re3br8re3f29ge3f29pe3ffbge3fcbqe3egd4e3drdte3azfbe3dlgme3dyi7e3c0j2e3dljfe3d8nge3ajobe3azpge3boqie3enqoe3az88e2dr06e1dy09e1di3ce1ag5le1aj73e1cm9pe1f99we1d5afe1fcbze1c3cve1duine1bhkde1cql6e1etlse1ghmbe1a9mue1gknde1d8npe1a9nse1gbr1e1d50me0ea1ie0c31re0av3ye0cz4ke0aj4ze0as7me0av7ve0bu90e0d8bde0d2bte0etcye0eddee0bhdhe0bbgde0drgse0e1hxe0drj2e0calve0agmee0agmke0admne0c3oxe0hmp3e0hfpte0gqqre0cwrae0flrde0d20jdzcz0pdzbo2ddzag6xdzdc76dzas7sdzed88dzbb8kdzc79gdzcwa5dzcza8dzczbzdzcacodzcgcodze4dndzdle6dzdcefdzd8ejdzd5emdzasevdzasf1dzd2fhdzazfrdzc0i4dzdylydzfylydzetmedzfimhdzdln3dzd8nvdzadnzdzc0o2dzadohdzc3ordzavppdzhfpzdzfpq8dzbbqfdze1qidze7qidzgnqudzczrddzdrrkdzdurndzegrndz') },
	{ src: 'worm2.webp', col: '#ffda7c', shape: new Shape('fl47emfw55emg65temcgicemaonhemgk6gelfdb3elevblelbfegelb4f9elb9gqelbnhbelcvixelfj3dekgu74ekh280ekgz8qekgr9heke7byekdhchekcld5ekc2dlekb1g0ekcyjqekclkhekajmoekc2oqekgea2eib7o0eifyakehclq4ehfl2negc5kzegbhlfegawm0egd3qhegcapeefdpqkefeaqhecfq1zebbsi2ebepqfebf5qfe9fjqhe9g4qpe8ghqxe8buo2e7cahme7grr5e7h2rae7cqche5bfdqe5bfole5hirie5h70le3g4b5e3c5e8e3awlfe3a0n4e3fwqfe3f005e2fd0be2gx0ge2fl0oe2gk0oe2hd0te2fl0we2ge0we2fl14e2gc14e2gz19e2fj1ce2g91ce2fj1je2fy1me2g41re2f84ue2djbte2e4cme2dbd5e2areoe2d9kee2c2lke2amo7e2ciqpe2hqroe2e7b8e1cajoe1es08e0en0de0fj0ge0ek0ie0gp0ie0ex0ye0g61je0g42ae0f02ve0hi7he0escce0bsf1e0djj5e0dhjbe0c0pwe0e7q2e0f0q2e0gcrae0fd0le0ei0oe0ha11e0h716e0fq1je0g94he0fg5qe0ft6ge0hi7ce0ge7ne0gkaqe0g1bde0fybge0flbre0fjbte0bxcue0c5ege0amgie0cajge0ablye0bhm0e0bxnpe0cqoye0f8q2e0gzrle0f805dzef0qdzh20qdzei0tdzf00tdzek0wdzgu0ydzen11dzep14dzev14dzf014dzex16dzfb25dzf02qdzg430dzgc4kdzf34pdzfq6edzha6mdzg672dzg97hdzhn8ddzhf99dzfy9mdzfdacdzgmandzghavdzfqbodzcvc4dzexccdzb4dsdzb1dvdzagfhdzagfndzajggdzcdh9dzawhbdzcqhodzd6iadzdek9dzbhkudz9yncdzbfnedzc8o2dzcqotdzcvpmdzc0q2dzdhq2dzc0q7dzghqkdzcoqvdzfgqvdzfqqvdzg4r2dzh5rldz') },

	{ src: 'plant1-small.webp', col: '#ffda7c', shape: new Shape('f5cfjqg8i6hueb6lhcce3ofsgnm6frhq76fhcbhof8gho3f3jng6ezaz2feyielietj283epg2p9epkbf6ena21relhn5lelb586ekb8grekfqq0ejjn8oei9e1cef8w13ede833edc8j0edfeqoedj5kuebh84reaknefeak5h6eak5hlea8b0re9bw1ue9b553e9k296e9chjfe9f2r3e97w0le8et36e8az7ie8an8oe8aqg9e8eqlue87k0fe6k89ie6ktdue6jhkfe6ikmfe6f839e5jb79e5kqfue5cnjue5eqrce5gz4ce4ae90e4kwdfe4a8fle4aefue4bqixe4jnk6e4hnnre4fh3ce3ah3fe3gt46e3az5fe3az5oe3aw73e3a899e3ke9re3kha0e3a2fce3azhfe3k8i0e3jtjue3jbl9e3eqm9e3fbnie3geq0e3fwqoe3cb1re19w2ie1dz2le1hn4ue1ie5oe1jb6xe1kka9e1kzcue1kzd0e1kzd6e1eeloe1fbnre1gwp9e1ehrle17b09e0780fe0an1ce0bk1ie0fq3fe0ah83e09ebfe09bc9e09bcie0kzcie09bcoe0kzcoe0kze3e09qele09teue09wf0e0bhire0jzjfe0ihmre0iemue0f2q6e0g8qfe0g5qie0enrle07e06dz850cdz8n0ldzbq1idzdt2fdzf22xdzah3odzgn40dzh84cdzat4rdzaw5xdzaw63dzat6ldzjw83dzah8cdza590dza29idz9w9odzknafdz9bbodz9bbudz9bc0dzkzc6dzkzccdz9bcudz9nefdz9wf6dzktg3dzkqg9dzakgudzkhgxdzk8i9dzbeiodzjzjldzcqk3dze8lldzf2n6dzfeoodzh5p3dzf8pfdzf8pldzgbqcdzehrfdzebrldz') },
	{ src: 'plant2-small.webp', col: '#ffda7c', shape: new Shape('dseokyf87ohucellhng5lcfmip9ifeb783fag13rf3htkif29t8uev8zjuetgd2leofvn3eojpaoenj5jcenbhp9egbe6oef8qkreffhnreeek3redjmioed88j0edh21leb8z9iebksfoebkpg3ebahouebc1pcebkweleakwf6eabm60e972cle9awp3e978c3e8kwe3e8iyk3e88mlce8a1ole8hn0xe6he13e6e13ue6h746e6k5bfe6ksdre6k2i0e6gz20e5ap6re5k5a0e5kmgie5kjgre5jvi9e57wile58mlre5i10le4hv0re4gn1ue4hh4fe4by5fe4j883e47pi9e4hvloe4cjpce4bbpue4i70fe3h52ce3ev3ce3dq40e3jj89e38t90e3k89re38m9ue38ga0e37eboe3kgh0e3keh9e3kbhie3jvj3e38mm3e3gqn0e3f4o6e3cspce3bbq3e3b7qce3b7qle3b4que3b4r3e3b2rce3h230e2ie09e1cy4fe1bt5oe19w7oe19g7ue19t7ue1kea9e1k8hre17ji0e182jie18qmfe19toce1d7p9e1hh1ie0gd1re0h536e0dh43e0de46e0hq4le0cn4oe0ht4oe0cj4re0ip5ue0is60e0iv66e09n7ue0js8fe0kpd6e07ghue085kce08alfe0fynxe0eyoce0e5oxe0dzp0e0dsp3e0djp6e0d2pce0gz16dzgg1odzfj2ldzf233dzch4udzce4xdzc156dzik5idzbh5odzbb5rdziy63dzb266dziy69dzaz6cdzan6idzj16ldza773dz9j7odzje7xdzjv8idzk89cdzkbbxdzkmcudz7ehodz7pixdz7wjfdz7zjodz88kfdziykldz8al3dzhtlxdz8qmldz97nodz9no6dzfdo9dzevofdzekoodzeboudzakp9dzdep9dzazrldzb4rldz') },
	{ src: 'plant3.webp', col: '#ffda7c', shape: new Shape('dsgfo57f8bfwgl6jfod266fj9779fbjf7lfb4lbueyi04feueu66eu5b79euiq3peqbn42eqal6jeq496weqmy6weql77leqkh8neqidpmeqe4qoeqeh1yehjs2neh8u5ueho066eh5na2ehkho7ehjsoweh8hp9ehayqbehglqbeh8u1yedkh1yedeh2nedal30ede430eday3dede43pede44fedgy4sedid5hed5n9ded4yased49kbedd2qoedf7qoedl71le99w2ne9eh3de9eh42e9cq4fe9eh4se9p354e9oq5he9id66e9366we9m97le92uc7e93jc7e936cje93wj9e93wjye9myl0e95nmse960n5e9ljn5e997pme9hbqbe9fwqoe9') },
]
let shapesFiltered = []

// ================================================================================================
// actual processing stuff

function preload() {
	// if (random() > 0.2) {
	// 	for (let i=0; i<floor(random(1, min(5, shapes.length))); i++) {
	// 		shapesFiltered.push(random(shapes))
	// 	}
	// } else {
		shapesFiltered = shapes
	// }
	// shapesFiltered = [shapes[0]]
	
	for (let shape of shapesFiltered) {
		shape.image = loadImage(`./${shape.src}`)
	}
}

const pointsTried = []
const pointsUsed = []
const pointUseTried = []
const pointUseTriedTooMuch = []
let points = []
let numItemsAdded = 0

let timeSpendRemoving = 0

function setup() {
	if (R_SEED) {
		randomSeed(R_SEED)
		Math.random = random
	}
	
	createCanvas(artWidth*renderMultiplier, artHeight*renderMultiplier);
	background(color(backgroundColor));
	noLoop()
	
	const poisson = new PoissonDiskSampling({
			shape: [artWidth, artHeight],
			minDistance: MIN_SCALE/2,
			maxDistance: MIN_SCALE/2*1.5,
			tries: 10
	});
	points = poisson.fill().map((p, indx) => ({x:p[0], y:p[1], r:1, id:indx})).sort((a, b) => random() > 0.5 ? 1 : -1);
	points.forEach(p => poissonPacker.addCircle(p))
	
	let pointsNotUsed = [...points]
	let pointCounter = 0
	
	const MIN_Q_SCALE = sqrt(2) * MIN_SCALE
	const MAN_Q_SCALE = sqrt(2) * MAX_SCALE
	
	const testTimeStart = Date.now()
	for (let i=0; i<NUM_ITEM_PLACE_TRIES_PER_FRAME; i++) {
		if (pointCounter > pointsNotUsed.length - 1) {
			pointCounter = 0
			// pointsNotUsed = poissonPacker.getItems()
		}
		const p = pointsNotUsed[pointCounter]
		pointCounter++
		if (!pointUseTried[p.id]) {
			pointUseTried[p.id] = 1
			pointsTried.push(p)
		} else {
			pointUseTried[p.id]++
			if (pointUseTried[p.id] > NUM_POINT_TRIES) {
				pointUseTriedTooMuch.push(pointUseTried[p.id])
				continue
			}
		}
			
		let x = p.x
		let y = p.y
		
		// ---------------------------------------- 
		
		// do a quick test to work out min scale
		let qtScale = MIN_Q_SCALE
		const quickAdd = packer.tryToAddCircle(x, y, MIN_Q_SCALE, MAN_Q_SCALE, false)
		if (quickAdd) {
			qtScale = quickAdd.r
		}
		
		// ----------------------------------------
		
		let currentScale = max(MIN_SCALE, qtScale)
		
		let rotateRadians = random(0, 2*PI)
		let lastAdded = null
		let lastAddedImage = null
		
		// get a shape to draw
		let currentShape = random(shapesFiltered)
		
		let maxScale = SCALE_MAX_IMAGE ? min(currentShape.image.width/pixelDensity()*MAX_IMAGE_SCALE, currentShape.image.height) : MAX_SCALE
		// maxScale = red(noise(x*0.002, y*0.002))
		// if (maxScale <= currentScale) maxScale = currentScale + SCALE_INCREMENT
		if (maxScale > MAX_SCALE) maxScale = MAX_SCALE
		
		while(currentScale < maxScale) {
			currentShape.shape.scaleRotateTranslate(currentScale, rotateRadians, x, y)
			const added = packer.tryToAddShape(currentShape.shape.circles, false)
			
			// never added
			if (!added && !lastAdded) break

			// wasn't added, but could add at last test
			if (!added && lastAdded && lastAddedImage) {
				const col = currentShape.col
				lastAdded.forEach(c => {
					circles.push({ x: c.x, y: c.y, r: c.r, col })
				})
				
				lastAdded.forEach(c => packer.addCircle(c))
				images.push(lastAddedImage)
				
				// remove all poisson points under shape
				if (doRemoveOfTestBranch) {
					const ss = Date.now()
					lastAdded.forEach(c => poissonPacker.removeCircles(c.x, c.y, c.r+PACKER_PADDING))
					if (random() > 0.95) {
						pointsNotUsed = poissonPacker.getItems()
					}
					timeSpendRemoving += Date.now() - ss
				}
				
				numItemsAdded++
				
				break
				
			// can add at size
			} else if (added) {
				lastAdded = [...added]
				
				pointsUsed.push({ x, y, r:1 })
				
				lastAddedImage = {
					x,
					y,
					scale: currentScale,
					rotation: rotateRadians,
					image: currentShape.image,
					color: currentShape.color
				}
			}
			currentScale += SCALE_INCREMENT
		}
	}
	console.log(`SETUP TIME: ${(Date.now()-testTimeStart)/1000}`)
}

function draw() {
	noStroke()
	
	console.log(`Number of Items Added: ${numItemsAdded}`)

	if (debug) {
		const m = renderMultiplier
		packer.items.forEach(c => {
		// circles.forEach(c => {
			if (c.col) fill(c.col)
			circle(c.x*m, c.y*m, c.r*2*m)
		})
	} else {
		const testTimeStart = Date.now()
		const m = renderMultiplier
		images.forEach(img => {
			let imgScale = 1/max(img.image.width, img.image.height)
			push();
			translate(img.x*m, img.y*m);
			rotate(img.rotation);
			imageMode(CENTER);
			scale(img.scale * imgScale * m);
			// if (random() > .95) {
			// 	tint(random(255), random(255), random(255))
			// }
			image(img.image, 0, 0);
			pop();
		})
		console.log(`DRAW TIME: ${(Date.now()-testTimeStart)/1000}`)
	}
	
	if (debugPoints) {
		const m = renderMultiplier
		
		// points that still exist to try
		stroke('red')
		poissonPacker.getItems().forEach(c => circle(c.x*m, c.y*m, c.r*m))

		// those that were tested
		stroke('green')
		pointsTried.forEach(c => circle(c.x*m, c.y*m, c.r*m))

		// ones that were actually placed
		stroke('blue')
		pointsUsed.forEach(c => circle(c.x*m, c.y*m, 5*m))
		
		// used too much, ignored
		stroke('orange')
		fill('orange')
		const pointsUsedTooMuchIv = pointUseTried.map((v, i) => ({...v, i, v})).filter(p => p.v > NUM_POINT_TRIES).map(p => p.i)
		const pointsUsedTooMuchC = pointsTried.filter(c => pointsUsedTooMuchIv.includes(c.id))
		
		pointsUsedTooMuchC.forEach(c => circle(c.x*m, c.y*m, 5*m))
		
		console.log(`Used too much: ${pointsUsedTooMuchC.length}`)
	}
	console.log(`Time Spent Removing: ${timeSpendRemoving/1000}`)
}

function keyTyped() {
  if (key === 's') {
    save('output', 'png');
  }
}