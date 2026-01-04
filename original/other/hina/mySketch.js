
// enable to see the underlying circles
const debug = false;
const debugPoints = false;
const doRemoveOfTestBranch = true; 

const R_SEED = 0;

// let artWidth = Math.ceil(window.innerWidth)
// let artHeight = Math.ceil(window.innerHeight);

const artWidth = 2500
const artHeight = 3500

// possibly 2x what we actually say here on high DPI
const renderMultiplier = 1
const backgroundColor = 255

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
const MAX_SCALE = 300
const SCALE_INCREMENT = 5
const SCALE_MAX_IMAGE = true
const NUM_ITEM_PLACE_TRIES_PER_FRAME = 20000
const NUM_ITEM_PLACE_TRIES_TOTAL = 20000
const NUM_POINT_TRIES = 5

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
  { src: 'racoon1.webp', col: '#ffda7c', shape: new Shape('ejj0hidpdch8d77ugwg7fofsg1mcfqbplofkg1ocf6e14uf4f7acf0bpaieyb7nceygjpoeuc150eqc1gceqb1k0eqh1qieqb7oiemf75cekcv46egb75ieghph0eghpr6egb7pceebp2oecavj6echjl6ecappuece10ueae11ceabj36eaed3ceabj3oeafp66eafv9ceab7foeahdp6ea9pq0eaa7q0eai7rieae11ue6bp26e6e72ie6e72ue6c140e6bj46e6b74ue6fv50e6ap66e6g18ue6av9ue6h1due6bdh0e6a7kue6e1moe6edn6e6ejnie6bvo6e68vq0e697q0e6gvrce6e126e4bd2ce4ep3oe4ap5ue4g7b0e4avbie4apbue4hde6e4a7mie4d7mie4a7mue4d1n0e4epnue4ajo6e4bpp6e4b72ue2d13ie2cd3oe2d73oe2ev3ue2b74ie2av50e2a17ue2g78ie2apbce2add0e2i7gce2b7gie2b1hce2b7hie2idi0e2aviie2a7kie2hvkue2hvm0e2djmie2ddmoe2hvp0e2app6e2f7pce2fjpoe28jq0e2fpqce2ijr6e2iprce2h7rie2') },
  { src: 'racoon2.webp', col: '#ffda7c', shape: new Shape('euhrn0f08lk466klj0nokfhgk653gmkuarg8b63fg0lunlfio0grfelo2lfa60fffa26nxfa96oxfalc8ff89u53ey90alewacprew9u1reu1cm9eo10l9emnio3emkoorem4cfrekpih9ek7upfekk629egqomfeg36oxegi033ee6idxeebcq9eed62lec965xec8u9fecmicfecnof9ec10kfec10n3ec0uofecao19eaji2feah62reaio2reamo69eami7reami93ea86bfean0brea3og3eaq6hleaocnxeabuqfea8o4le8962le6mo3le69649e6mu5re6m079e6mod3e6o6f9e636gfe6pogle60clle6rcmle6jiple6b619e4ki1re4do2fe4go2le48u5le4966fe4mc6re48o8re46odfe4niere44if3e4r0lre4qcmxe4n0ore416oxe42op9e43op9e440p9e4jupfe4k6pfe476pre4h6qle4gcqre4ac0xe2mi1fe2mo1le2mu1re29029e2e02fe2902xe2mo3xe2n663e2mi6xe2n6b3e27ubre27oc3e2n0c9e24oexe22ugle22igre2qii9e216j9e210jxe20clxe20omre20onxe20io3e2o6ofe26upre29iqfe2') },
  { src: 'racoon3.webp', col: '#ffda7c', shape: new Shape('doc0lae64iiaaoj0h4h0iogwa6mcfsholofqic66fkc6m0fghup0fg8670fajogif6icnif6conif09uocf09cpif0d0qcf09u5ieyhcqiey80guewd0ooew7c86eo9u3oeme0jiemfuliem80q0emio4iekkcfcekh0niekjcpoekiiquekbur0eke0queggcr0eg9i4ceejo7iee6u8ueek0i0eeac2ceckue0ec7ihuecjckuecao1ueaa02ueaii3oeajc4oeak080eakc8oea8clcea8oniea76q0eacirceadircead0riea9u26e876fue87o5oe67c5ue66o9ce6koeie6dckue6f0l0e6jcmie6k0pue6bi10e4b01ce47066e46o76e46u7ie46uf0e4l0f6e470fce46ufie470hce4k6ioe4eck6e4eikce4jikce480kue4jilie4gcnoe48oo0e4boo0e4gio0e4dupce4k0pie4gipue4acq0e4juq6e48oqie4eir6e4ci0ce2cc0ie2ho1ue29i30e2ii36e2904ue2k06ce26u6ie2ju70e2ki96e2l0aue2l6ece2kufue2eokue28clue2jilue2fumce28cmue2jimue2c6pce2e0pue2j0qce27cqie2i0rce2') },
  { src: 'racoon4.webp', col: '#ffda7c', shape: new Shape('e6jokyduccj0ec66hsa0pifghopuf8bi3cf086nif08ub6eyioe0eyh03cew7cliew7omiew76ioeq70jieq8ooieq96eoeo869oem8occemjceuemf02cekhu2oekai2uek70kiekdo2cegfo2iegjcoiegiup0egboqceg90quegicr0egec26eeau80eej0cuee8udieek0fiee7ih6eeccqiee80r0eed02iechi8oecgc2ieaci2oea7choealck0eacuqoeaj0r0ea8ir6ea808ue68ua0e680aie6j0c6e68ceie6kcg0e67ugie6kogoe6kuh0e6juo0e68cpce6j0poe6g0qie69or6e6i0rie6iorie6h62ce4hu40e4i04ue4ao7ie47o8oe4hu90e4i69ce4j0bue4kuhce46uhoe4l6i0e466iue46ckce4kum0e4l0mce4komie4juoue4jip6e4jcpce4j6q0e4gcqie4b6qoe47cr6e4hir6e4jir6e4j0rie4hc26e2b02ce2ai3ue2ao46e2au4ce2hu4ce2ao4ue29u60e2ai76e2i07oe2hu86e27i8ce2a68oe27c8ue27i90e28i90e2i096e2ioaoe2iub0e2jid0e280e0e28ie0e2kofue2kug6e27igie27cgoe2l0goe2l6h0e26ohie2l0hue2lii0e2lci6e266iie2l6iie266j6e26ckoe2l6kue26im6e2kimue26uo6e276o6e27coce2jop0e2jcpoe2b0que27irce2horce286rie2') },
  { src: 'racoon5.webp', col: '#ffda7c', shape: new Shape('gch5k09i9njek6lzgu8045gs4u6ngseub5gkhonngac6lng4n0n5fioonbfeaif5f8q6n5f6b045f0aunhf0g6pnf0409hew1c45eu205beuhiazeuj0bneom0jhemf6qbemeu85ekaujtek9unzek8uo5ek7o15eg563heg1035eec04neeei7beed6nneecontecbunzec86obec1u6beafi8hea3095ea36a5ea40aneaiiazeamcibeamcitear6mbearcntealuoheajoozeaecq5eah6q5eahoq5eaeiqneag6qtea7c0ne60c3be62o8te62cabe646b5e6jubze6mihte6ackbe69umbe6donbe68c15e40c2ne4162ne40i2te4ao2ze41u3be4c645e4e66ne41u6te4ec6te41o6ze42oa5e4a6ghe4rimne4rimze4f6n5e4rinbe4eupne4icpze4860te25c2te21u2ze24i3ne2064be22u4he2ci4ze2e06he2207be2f07he22c8ze22i95e246bhe24cbne2jubne2k6cbe2kcche28uf5e29ugbe2mighe2mihbe2aiize2a0kte2n6lbe2nclhe2nolne2pilze2a0mne2donte2cco5e2r0o5e27oohe2acohe2poohe2mcone2e0qhe2f0r5e2') },
  { src: 'racoon6.webp', col: '#ffda7c', shape: new Shape('fgg6kogm7ijkbym6he7anog4ksbug2cy30feiamcfeiy2cfa5ypifad4pif4gsmueufgn0eubs20eqjm10eoeaq6eols9uemlydoem9gjcemgg1uekha1uekjaniekbspoekf4qcekem26egfsqoeg5sr0egfm1ueebg2uecmmaiec54ocecbs4ceabmaiea8yi6ea94ioealsioea94k0eak4l6eajsliea8gloeahynueaignueaeyo0ea9aooea7aq0ea54qoea6sqoeag4r6eai416e8cs1ie8bg50e6ba5ce6ly5ie6ma6ce6ay6ue6as76e6a47ie6ay80e6ay8ce6ma90e6mg9ce6m4eie6lyi6e64sooe6ka0ie4ka1ie4f41oe4ls50e4b45oe4as5ue4m45ue4ay60e4as66e4ag7ce4am7ie4ag7oe4ay7oe4b4aue4mmd0e48shie48mhue4lgjce4kmkoe4kgkue4fgo0e4jso0e4iso6e4aspie47spue46gr0e4far0e4js06e2k40ce2kg16e2ay1ue2dy1ue2ka1ue2lg4ie2ay5ie2ag66e2ay6ce2am6ue2ma76e2ag80e2am86e2aa8ce2ma8oe2myaue2ayb0e2myb6e2m4eue28mhce2lmj6e2lajoe2kyk6e2kskie25sm0e24ynie2hanoe2hgnue2jynue2k4o0e2j4o6e28apoe2aypoe2eypoe2b4pue2fmpue2c4qce2dmqoe2') },
  { src: 'racoon13.webp', col: '#ffda7c', shape: new Shape('g0d9myoi9xgmbol9g27ogxg0h0mffs60i9fo4ij9fi2ujxfep6clfal6krfakinlf6h649f4iinrf4eu49f0dc4lf0mcjreyc053ewqo83ewau5reu1ck9eucon9eua06feqkum9eq9ujxeodonleolunxeofu3rem9c73ekp6e3ek70efekncilekfinrekii4fegn07feg8o7xegeum9egeinreg8c8fee808xeer693eebinfeej64rec96j9ecmc6reano79eapo7fea7o9fea7i9xea7cafeap0ereaouf9eaoofxeanuhxea0ikreajioleacc43e676b9e630ife68uixe67oj3e660k3e69ikre61ul3e6a6mxe6gco9e6h6ofe6du3le4b04re4jo4xe476axe470bxe4qibxe46udle4pudxe46iexe4oigfe440kxe49cl3e4ain3e4g0o9e4fi33e2e03fe2ci3re2c03xe2m06fe28o79e2rc9le26ud9e2q0dre25igfe2ocgxe2o6h9e2nij9e290jre26ck3e2n6kfe2n0kle23ul3e2aon9e2e6o9e2euo9e2goofe2hiole2lcole2') },
  { src: 'racoon15.webp', col: '#ffda7c', shape: new Shape('edfik4dv8uiue73uh6hvkogmbpl6gmh72ifoh756foidnifobpo0fk8v8ufebv1if691acf4ippcf49jbif0bvpoeyij16euav4ieuf7loeubdqoeu6j6ueq7d7ieqk1cueqijaieo9jjieo5p6iekkvdcekjviiekedm6ekljdoeejpq6eeajr6eeg110ecj1bcecjjc0ecm1e0ec91iueck1mieca1ncecad5cea5760ea8vcieamje6eak7j6eaav2ce66760e6877ce6k7hue691k6e6k7n0e6gjn6e69jnce6a1nue6hdp0e6j7qie6cdqoe6b10ie4cp0ie4cv0oe4hp0oe4gj0ue4ij3ue4id6oe47j9oe48dhoe491kie4appie4k1poe4adqoe4c106e2cj0ce2av0oe2fj0ue2b12oe2av3ie25v5oe2a15oe29j5ue29v5ue29p66e2ij6ie2ij70e27pace2lde6e28dh6e28pi6e28jice2fpmie29dmue2ddnce2ddnue2a1o6e2adp6e2d1p6e2ajpce2hdpce2c7r6e2') },
  { src: 'racoon16.webp', col: '#ffda7c', shape: new Shape('8uerlse6krhi8o6rh45i7lgol6lxgkaumlge7umlfybu7ffu3699fsnin9feiunffa5om3f6gonff61uaxf4gchrf4gue3ewgofreq1cc9emdo89egp0nregc05fee2o6xeee08reehcileehij3eei0jxeeiik3eej0k9ee4cl9ee5unfeeponxeeqcnxeefco9eehoo9eejuofeecuo9ec90ofec10dleanulrear0nxeaeuofeamiofea4omxe86o43e6664le65i4re63063e62o69e61o79e62079e62i7fe6207le6e07re6eu9le610cxe6gugle63ukxe6icm3e64cmfe6homfe6ciole6703xe46c43e45u4fe4564re4bc4re44o4xe4ci5le4365re4du79e41o7re4ei8fe4ei93e4fi9le4109re4foare4g0b9e40ible4hcf3e4hohxe4hukfe43ikle4ickle4iikre4ooo9e4rco9e4diofe4e0ofe4ecofe4fuofe48iole4kcole4koole4ocole4ouole49core4huore4i6ore4noore4o0ore4oiore46o3re26649e2464re25u4re23u59e2co5fe2305le23c5le2d65re21o6xe21i7le2eu7xe2eo83e2168le2eo8re2eu99e2f69fe21c9re2fi9xe2fia9e2fuaxe2g6b3e2gib3e20obre2g6bre20ue9e2hoere2hiexe2hcgxe2huhre2i6hxe21uife2kij9e2k6jfe2jojle2jijre2i6kre2nul9e24cmre256nfe266nxe2g0ole2lcole2luole28oore2c6ore2fiore2hiore2p0ore2buoxe2') },
  
	{ src: 'monstera1.webp', col: '#ffda7c', shape: new Shape('5ve0g271c6fo6j7ofi4pfufee1pifeapncfcfd70fand7uf8ejmif8cv40f6gj4of6dvacf6gvnuf6d760f4njb6f4mdeif4ndfif4lpicf4ivjcf4h7p6f4cv2of0iv7cf0lv7if0ojc0f0l1dcf0ede0f0dvguf0i7i6f0adk0f0812iey6d60eyij8oeyep9ceylvaceyedboeydvd0eykdgoeym7jieyjdkieyad5cewkp9uewi1b0ewjdfiewnvgoew7vhoewedhuewgvloewe1nuewhd36eua170euk176euej86euod8ueu5d90eujj96eu4j9ueuajb0euj7boeuk1cceugvcieuhddceui7e0eudpf0eu8jgceuh7goeu47hceu3pi6eubvi6eub1j0eudpjoeufvjueujvloeukdmueub10ueqav3ueqhp5ceq7p5ieq877oeq9v9ieq7vaieqfpeieq9pf0eqgdkoeqe7l6eq9vloeqc7loeq9joceq9dp6eqbv1ieo972ueo7130eo8j56eoap8ueo8v9ueo9pbieogjfueodvr0eoid2uema136em9d56em917cemh7acemp1d0emcph6em7djoemfpn6embdq0emf7qiemhp76ekhd8iekcd8oekcjacek41aoekbpaoek8vbuekcjd0ekb7ecekj1eieko1hoekf7iiekdpioek7pj0ekejkcek77kiekm1koek6vl6ek6pmcek9dmoekbdooekbjquekdj80eij72ueg6j3oegk14iegkp4iegiv4uegbd5ueggd60egid66egcd70eggv70egb176egaj7ueghv9iegg19uegfjc0egajeoeg3pj6egcvkcegc1mieg9pq0egi1q6ega70oeefj5ieegj86eepddoee8vfceeedfuee6jg6eekjhuee97kieecdkueek7nueegvqieed1qoeegd3cecld4oec5d6iecbp76eccv7cecbj8oecc1diecbpduecidf0eccpfcec9dfuech7hoecddliechjmiec97ncecb1pcec9j0ueacp1ieajv2ueadv36ea6140eabj4ieajd4iea5j5ceaip5oea7j6ceakv6oeakv80eacv86ea818ieacv9ieap79iea3pbceaadc0eagdduea3peoeafvfceaopfueaevgceai7h0ealjh0eacpioeafviueam7lcead1lueabdm0eahvm6ea6vn0eaidpoeadj7ce8avcce8cvdoe8d1ice8cvj6e8hjqie8kd36e6dv4ue6bv66e6mp6oe6op7oe6ov80e6n1a0e671ace6opaoe6p1b0e657bue6l1c6e637cce6adcie62vcoe62jd0e6m7d6e6pdece6l1eie63df0e6b1f0e6gjf0e637fce671fue6fpgce66vi0e6o7ice6o1ioe6n1iue6ddkoe677lue6ldn0e6j1oce6a7qce6gjr0e6bp2ce48j3ie4fv3ie4kv3oe4l746e4i14ie4j75ie4jd5oe4jp5oe4k15oe4h160e4dv76e4h77ue4fv8ce4gv9ie4819oe4gp9oe4ov9ue4pda0e4gdace4fvcie481doe4bdf0e4bpf0e4c7f6e437foe4cpfue4fdgce4g1gie4j7gie4ovgie47jgoe4ophce46pice46jj0e43pjue4h7kie4apl6e4lploe4l7nce4d1noe4ivnue4ivooe4j7p0e491q0e4hvque4h1r0e4epr6e4fjr6e4d1rce4bv0oe29110e2hv26e2ip26e2bp2ue26736e2kp3ce27j3oe2fp3oe25j4ie2814ie2914ie2c150e2jj50e2jj5ie2kd5ue2kp5ue25760e29j60e2lj60e2m160e2jd6ce28d6oe2516ue29p80e24v86e27p8ue2kj8ue2n196e26d9ce2fda6e2jpa6e29pace2f7ace2j1aoe2kvaue2cdb0e2cpb0e2f7b0e2m7bie2g1boe23jbue24vc0e29pcce2d1cce2b7cie2apcoe2ppcoe2a7cue221d6e2gddce2jvdce2fjdoe23pe6e2c1f0e2bjf6e2kdfce2kjfie2d1fue2cjgce26dgoe2ovgue2bph6e28vhce2nvice26jioe26piue2ejiue2c1j6e2f1j6e26jjce26djie2k7joe26djue2bjjue26pk0e26dk6e26dkie2mpkie28pkue2avl0e28pl6e26dloe28jlue2m1lue291m0e2fvm6e2g1mie2j7mie2c7n6e2ijnie28vnoe2kvnoe2j1o0e2f1o6e2cvoce2k1oce2j7ooe2adoue2apoue2a7p0e2a7pce2bppce2j7pce2a7poe2fjpue2ijqie2adqoe2avqoe2idqoe2fvque2hpr0e2cvr6e2c1rce2') },
	{ src: 'monstera3.webp', col: '#ffda7c', shape: new Shape('c9luheblpcgcaxi6gacxeofs9xb6fie3oufe6r7if893cof8dxqcf8gl9of68920f4erjcf47l8of0craif0gl2iey9x36eyer36eyhx9oeymxaueyjra6ewdrccewk91ieui920eubrb0eu8fi0eubr46eqb3e6eq6lgueqj91ueocr2ueoal40eoaf6ueobf7ieo8r86eo839ueo7lcoeoeldceoerf6eo6l1iemef20em5f76emexe6emb9foem4x0oek5l10ekl91oekdl36ek8r6ceka39cekcx9cekf99iekkra0ekiracek63auek89b0eka9diekaxf0ek6fg0ekfx3cegcl4ieg8x76egb98iegil8uegj98uegar9iegklaueg6xb0eglrb6egcxgueghr2uee9f66ee9x8iee4l8oeejx8oee8l96ee6l9iee739oeeb3cceebld0eeflf6ee73foee9lg0ee93giee63hoee7ficeebx30ec8r36ecb96oec4l7cecdl9ieclla0ec5faoecerc0ec6rc6ec7lguecdfiiec99k0ec9fo0ec7916eadr1oeafr1uealx1ueabr6oeac370eaa37oead38oea5990eab996ea5x9ceam3a0eah3b0ea7lb6eal3b6eacxboeanlboeaf9cueafreceadfgieaf9noea9lqueacrriead9rieabx2ie8bf3ce8837oe853a6e8490ie6l310e6h91oe69l20e66x26e6ax2oe6b92oe6d94oe68360e69x60e6a960e6al60e67f6ce65r6ie64986e6f38ue6ff8ue6ef9ie6dlbce6m9boe669bue6blc0e6bxcce6c3coe6frcoe6cfcue6g9ece66lfce689fie68rfie67rfoe693foe67xgie689gie68lgoe68rh0e65rh6e6dxice699oie6f9pue6f9q6e6f9qie6f3r0e69xr6e69310e4d31ue4cx20e4j32oe4dx3ue4437ue45f80e4ix8ce4kf8ue4e39ce44race44xaie47faoe473bue46rcoe4g3coe47xdie4ffdie4frdie4g3die48fdue48xe0e499e0e4gle6e4a9ece4g3eue4fffoe4a3fue4efg0e4e3g6e48lgce48fh0e4flkce4flkoe4j910e29916e2er1ce29f1ie25r1oe2jr2ie2ir2ue2h93ce2fl3ue2e340e2er4ce2er4oe2ax4ue2al50e2el50e2al5ce2el5ce2al5oe2ef5ue2ef66e2596ce27r6ie2836ie29l6oe2e96oe2e970e2497oe2e37oe24f7ue29r80e2ar80e2e380e25l86e2cx86e2j986e2jl86e2dx8ie29f8oe2af8oe2hf8oe26f8ue2dx8ue2dx96e2kf9ce28x9oe2el9ue2dra0e24la6e279a6e2flaie2fraoe2lfaoe2glb0e2dxbce2efbie2exbie2f9c0e2n9c0e2cfcie2gfcoe2axcue2fxdce2h3die283doe29le0e2gxe0e2a9eoe2g9eoe27lfce27xfce27lgce25rgie283gue269i6e2flice28xjie299q6e2') },
	{ src: 'monstera4.webp', col: '#ffda7c', shape: new Shape('4vi0hohvaohe8phcgueddigk3dligkl166gc975og8kd3og0ojaify67aofyipmofsbj6ofqe1g6fqn1hufqipkifqcpnufq8daufohje6fomdg0foipicfodvk6fodp2cfkd7m0fk2vo6fk47bific7fifiedi0fi97kcfi7voifia7b6fg71q0fgf13ofe6v6ifed77ofebpbofeljecfeidgcfe91m0feev8ofakjd0fabvpifaip1uf8hj76f8g150f6hvoif6bv20f4p7cif4pd8if0gv60eymdaoeymjjoey31coewkv8oeu71eueuhj0ueqldb6eq5pqueqpje0eo97nieoavqieoajf0emh1poemmj46ek5j7cek1djiekm1koek7pmuekj7oiekaj2ceg479ueg1dncegddpoeg37puegqd80ee2ddiee5veceepjeueegj0iec6v4uecppfcecapjiec61loeca1queccp0ueak11ieafd26eabd4oealv8iea7p96ead7b0ealjc0ea7vecea1jg6ea11iceacvioea11iueak7jcealplceak7nueajvo6eagjqcea4vr0ea9pr6ea6driea5jroe8hd1oe6i736e6mj3ce6dd66e6bv8ie6dj96e69dcie65dcoe6avd0e651e6e65de6e68dece69jeie69veie6ppfue617gue6fph0e611hie611hue6fjj6e611k6e6evloe6bjmce611mue64jo0e667ooe6d1qce67jrie6id0ie49v2ie4n14oe46d50e4ep56e4g76ue4ep76e47v7oe4517ue4mj86e44j9ce4qdbie42jboe491cie4opdoe4jddue427e0e44pe6e48pece4j7eue4ppg6e4h7hce4h7jce4fjjie4nvjie4npjoe40vkie4ajlce4kdlie4l7m0e4ejn6e4avoie4dvpce421poe42jpue45dq0e44dr6e4adr6e4g10ie2d70oe2gp10e2hj2ie2md2ue2mj30e2i73ie2dj40e2774ce2bv4ue2fv6ie25d6oe2g16oe2617ue2mv7ue2qv7ue24v80e2mp80e2r180e2md8ce28j90e23ja0e2cvaie22dbue2qdbue25pcoe2m1cue241d6e221e6e291ece2q1eoe21vfoe2gvfue2o7gce217gie2pjgie2jvgoe2kvh0e211h6e2bph6e2l7hie2ljj0e2b1j6e2avk0e20pl6e2bpl6e2h1lce20ploe2h1loe261m6e2evm6e2epmue2b1n0e2gvnce2gvnoe217o0e2j1p6e23vpoe227pue2adpue2hvpue2ddqce2g1qoe297rce2') },
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
		
		let maxScale = SCALE_MAX_IMAGE ? min(currentShape.image.width, currentShape.image.height) : MAX_SCALE
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