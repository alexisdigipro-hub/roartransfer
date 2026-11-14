// roartransfer.com home page (moved out of index.html on 8 Nov 2026 so browsers keep it)
(function () {
  // RoarMe's own project and public key (src/lib.js); what each person may write is enforced by the database
  var URL_ = 'https://bzmjhbnwhdwmncxkqkdl.supabase.co'
  var KEY = 'sb_publishable_7mQ3e0NH5lCmdoIKx2-FUA_EgCoXx9X'
  var BUCKET = 'roar-transfers'
  var MAX = 3 * 1024 * 1024 * 1024
  var DAYS = 1, mode = 'link'
  // Free (Alex, 21 Oct): 1 day up to 5 GB, or 3 days up to 3 GB; 7 days up to 1 GB since 23 Oct
  var GB = 1024 * 1024 * 1024
  // without an account (Alex, 21 Oct): link only, 24 hours, up to 1 GB, 3 transfers a day (roartransfer-r2 GUEST)
  // Pro (Alex, 26 Oct): the shorter, the bigger: 1 day 50 GB, 3 days 40, 7 days 30, 30 days 20 (roartransfer-r2 PRO_GB)
  var PRO_GB = { 1: 50, 3: 40, 7: 30, 30: 20 }
  var isProNow = function () { return !!user && !!pro }
  var lim = function () { return limG() * GB }
  var limG = function () { return !user ? 1 : isProNow() ? PRO_GB[DAYS] || 20 : DAYS === 1 ? 5 : DAYS === 7 ? 1 : 3 }
  var guestLeft = null
  var PIECE = 6 * 1024 * 1024
  var TUS = URL_.replace('.supabase.co', '.storage.supabase.co') + '/storage/v1/upload/resumable'
  // the download page every RoarTransfer link opens (RoarMe's ?t=, src/transfer.jsx TransferPage)
  // (the site's own one; a copy opened elsewhere, as in a local test, links to the live page)
  var PAGE = 'https://roartransfer.com/'
  // the bridge to Cloudflare R2: signs each piece, makes the link (supabase/functions/roartransfer-r2 in roarme)
  var FN = URL_ + '/functions/v1/roartransfer-r2'
  var PART = 16 * 1024 * 1024

  var EL = {
    'out': 'Αποσύνδεση',
    'in.title': 'Μεγάλα αρχεία, <b>ένας σύνδεσμος</b>.', 'tag': 'Στείλε μεγάλα αρχεία – Δωρεάν & με ασφάλεια', 'clean': 'Χωρίς διαφημίσεις. Κανένα AI δεν εκπαιδεύεται με τα αρχεία σου.',
    'in.email': 'Email', 'in.pass': 'Κωδικός', 'in.go': 'Σύνδεση',
    'gt.sub': 'Κάποιος σου έστειλε ένα αρχείο με το RoarTransfer.', 'gt.go': 'Λήψη', 'gt.send': 'Στείλε κι εσύ αρχεία', 'gb.t': 'Το πήρες; Σειρά σου.', 'gb.p': 'Στείλε κι εσύ μεγάλα αρχεία δωρεάν, ως 5 GB, με έναν κοντό σύνδεσμο. Ως 1 GB χωρίς λογαριασμό.', 'gb.go': 'Στείλε αρχεία δωρεάν',
    'pk.title': 'Στείλε<b>Μεγάλα</b>Αρχεία', 'pk.drop': 'Άφησε τα αρχεία σου εδώ', 'pk.or': 'ή πάτα για να τα διαλέξεις',
    'pk.go': 'Αποστολή', 'st.how': 'Πώς θες να το στείλεις;', 'st.long': 'Για πόσο να μείνει;', 'op.more': 'Περισσότερες επιλογές', 'op.mail': 'Email', 'op.link': 'Link', 'op.d1': '1 μέρα', 'op.d1s': 'ως 5 GB', 'op.d3': '3 μέρες', 'op.d3s': 'ως 3 GB', 'op.dls': 'Κάθε αρχείο κατεβαίνει ως 5 φορές.', 'op.d7': '7 μέρες', 'op.d7s': 'ως 1 GB', 'op.eco': 'Η πιο πράσινη επιλογή είναι και η πιο μεγάλη: τα περισσότερα αρχεία παραλαμβάνονται την ίδια μέρα, οπότε ένα link μιας μέρας μένει λιγότερο στους servers μας και χωράει ως 5 GB.', 'op.notify': 'Στείλε μου email όταν κατέβει', 'op.pc': 'Να μείνει μόνο στο pCloud μου', 'op.pay': 'Κλειδωμένο ως την πληρωμή',
    'ios.tip': 'Για το πρωτότυπο βίντεο, διάλεξε «Επιλογή αρχείου» και όχι «Βιβλιοθήκη φωτογραφιών»: το iPhone μικραίνει τα βίντεο της βιβλιοθήκης.', 'pay.h': 'Σχεδόν έτοιμα', 'pay.p': 'Τα αρχεία σας είναι έτοιμα. Θα ανοίξουν μόλις ολοκληρωθεί η εξόφληση. Σας ευχαριστούμε για την εμπιστοσύνη.', 'pay.o': 'Your files are ready. They will open as soon as the final payment is settled. Thank you for trusting us.',
    'up.keep': 'Κράτα τη σελίδα ανοιχτή ώσπου να τελειώσει. Αν πέσει η σύνδεση, συνεχίζει από εκεί που σταμάτησε.', 'up.stop': 'Διακοπή',
    'dn.all': 'Αντιγραφή link', 'dn.share': 'Κοινοποίηση', 'dn.mail': 'Email', 'dn.again': 'Στείλε κι άλλα αρχεία',
    'cr': 'Ένα καρέ από', 'in.name': 'Το όνομά σου', 'in.forgot': 'Ξέχασα κωδικό', 'pw.title': 'Νέος <b>κωδικός</b>.', 'pw.label': 'Νέος κωδικός', 'pw.go': 'Αποθήκευση και σύνδεση', 'lg.price': 'Τιμές', 'lg.priv': 'Πολιτική Απορρήτου', 'lg.terms': 'Όροι Χρήσης', 'agree': 'Συνεχίζοντας αποδέχεσαι τους <a href="terms/">Όρους</a> και την <a href="privacy/">Πολιτική Απορρήτου</a>.', 'sgn': 'Σύνδεση', 'rc.go': 'Roar Account', 'set.h': 'Ρυθμίσεις', 'set.acc': 'Λογαριασμός', 'set.plan': 'Πακέτο', 'rc.or': 'ή με email', 'rc.wait': 'Επίτρεψε το RoarTransfer στην άλλη καρτέλα', 'rc.waitP': 'Συνδέσου εκεί με τον Roar Account σου και πάτα Allow. Αυτή η σελίδα συνδέεται μόνη της.', 'rc.again': 'Άνοιξε ξανά τη σελίδα', 'rc.x': 'Άκυρο', 'mf.t': 'Επαλήθευση δύο βημάτων', 'mf.p': 'Γράψε τον 6ψήφιο κωδικό από την εφαρμογή επαλήθευσης.', 'mf.go': 'Επαλήθευση', 'rep': 'Αναφορά κατάχρησης', 'of.line': 'Χωρίς λογαριασμό · ως 1 GB', 'of.go': 'Αποστολή', 'more': 'Σχετικά με εμάς',
    'tb.send': 'Αποστολή', 'tb.mine': 'Οι αποστολές μου', 'tb.admin': 'Διαχείριση',
    'gr.exp': 'Αυτή η αποστολή έληξε', 'gr.t': 'Μία τελευταία<br><em>λήψη</em>', 'gr.p': 'Κάνε δωρεάν εγγραφή και μπορείς να το κατεβάσεις ακόμα, μία τελευταία φορά.', 'gr.up': 'Δωρεάν εγγραφή', 'gr.in': 'Σύνδεση', 'gr.last': 'Το link έληξε: αυτή είναι η τελευταία σου λήψη για κάθε αρχείο.',
    'mn.title': 'Οι <b>αποστολές</b> μου.', 'mn.sub': 'Ό,τι έστειλες, από εδώ, το RoarMail και τις συνομιλίες σου. Τα links ισχύουν 1 με 7 μέρες.',
    'f.all': 'Όλα', 'f.on': 'Ενεργά', 'f.off': 'Έληξαν',
    'ad.title': 'Όλες οι <b>αποστολές</b>.', 'ad.sub': 'Μόνο εσύ το βλέπεις: ποιος έστειλε τι, πόσο μεγάλο, πότε, πόσες φορές κατέβηκε. Ποτέ τι λένε τα αρχεία.',
    'ad.days': 'Ανά μέρα', 'ad.kinds': 'Είδη αρχείων', 'ad.top': 'Ποιοι στέλνουν τα περισσότερα', 'ad.acc': 'Λογαριασμοί', 'ad.tx': 'Αποστολές', 'ad.ov': 'Επισκόπηση', 'va.free': 'Δες το σαν Free χρήστης', 'va.pro': 'Δες το σαν Pro χρήστης', 'va.back': 'Πίσω στο Admin', 'em.h': 'Email', 'em.dl': 'Όταν κάποιος κατεβάζει ό,τι έστειλα', 'em.got': 'Όταν κάποιος μου στέλνει αρχεία στη σελίδα μου', 'em.note': 'Τα email εγγραφής και κωδικού έρχονται πάντα.', 'mt.sent': 'Στάλθηκαν', 'mt.got': 'Ήρθαν', 'mt.pro': 'Pro', 'ad.web': 'Ιστότοπος', 'wb.d7': '7 μέρες', 'wb.d30': '30 μέρες', 'wb.d90': '90 μέρες', 'wb.all': 'Από την αρχή', 'wb.days': 'Επισκέπτες ανά μέρα', 'wb.co': 'Χώρες', 'wb.ref': 'Από πού ήρθαν', 'wb.pg': 'Σελίδες', 'wb.dev': 'Συσκευές', 'wb.lang': 'Γλώσσες', 'ad.pro': 'Pro', 'pr.m1': '1 μήνας', 'pr.y1': '1 χρόνος', 'pr.ever': 'Lifetime', 'pr.make': 'Κάνε Pro', 'ad.bg': 'Φόντα', 'op.d30': '30 μέρες', 'op.d30s': 'ως 20 GB', 'ad.store': 'Χώρος', 'ad.all': 'Όλες οι αποστολές', 'ad.more': 'Περισσότερα'
  }
  var W = {
    en: {
      payFail: 'The link was made but could not be locked. Open it in My transfers and turn on Locked until paid.', goMail: 'Send', goLink: 'Get the link', moreS: 'Title, message, password', mTitle: 'title', mMsg: 'message', mPw: 'password', mPay: 'locked until paid', mPc: 'pCloud',
      more: 'Add more', more2: 'or drop them here', of: function (g) { return 'of ' + g + ' GB' }, file: 'file', files: 'files', over: function (g) { return 'Over ' + g + ' GB' }, tooBig: function (g) { return 'over ' + g + ' GB' },
      to: 'Send to: emails, separated by commas', title: 'Title (optional)', msg: 'Your message (optional)', pw: 'Password (optional)',
      noTo: 'Add at least one email to send to.', badTo: function (e) { return 'This does not look like an email: ' + e },
      mailed: function (n) { return n === 1 ? 'Sent by email to 1 person.' : 'Sent by email to ' + n + ' people.' }, unmailed: 'Some emails could not be sent:',
      gFrom: function (n) { return n + ' sent you' }, gLocked: 'This transfer has a password', gPw: 'Password', gOpen: 'Open', gWrong: 'Wrong password, try again.', gSlow: 'Too many wrong tries. Wait 15 minutes and try again.', gLeft: function (n) { return n === 1 ? '1 download left' : n + ' downloads left' }, gUsed: 'Download limit reached', gUsedN: 'This file has been downloaded as many times as it can be. Ask for it to be sent again.',
      until: 'until', sent: 'uploaded', sentOne: 'Uploaded!', sentMany: function (n) { return n + ' files uploaded!' }, none: 'Nothing was uploaded',
      lmOpen: 'Open link',
      left: 'Anyone with the link can download until', copy: 'Copy link', copied: 'Copied', allCopied: 'All links copied', cant: 'Could not copy',
      bad: 'Wrong email or password.', offline: 'Could not reach RoarTransfer. Check the connection and try again.',
      inSub: 'Sign in to send up to 5 GB, by link or email.', upSub: 'Make a free account to send files up to 5 GB.',
      inGo: 'Sign in', upGo: 'Create account', inQ: 'No account yet?', upQ: 'Already have an account?', inSw: 'Sign up', upSw: 'Sign in',
      upMail: 'Almost there: open the email we just sent you and press Confirm my account. It brings you back here, signed in.', upShort: 'The password needs at least 6 characters.', upTaken: 'There is already an account with this email. Sign in instead.',
      off: 'RoarTransfer is not open to this account yet.', stopped: 'Stopped.', leave: 'Files are still uploading.',
      mailSub: 'Files for you (RoarTransfer)', mailBody: 'Download them here, until', remove: 'Remove',
      phSave: 'Save to Photos', phPrep: function (p) { return 'Preparing… ' + p + '%' }, phReady: 'Tap to save to Photos', phDone: 'Saved? Save again', phFiles: 'Download to Files', phFail: 'Could not prepare it for Photos. Download it to Files instead?',
      gExpires: 'Expires', gGo: 'Download', gAll: 'Download all (.zip)', trialNoMail: 'Pro Trial is on, but the email could not be sent.', zPrep: function (p) { return 'Zipping… ' + p + '%' }, zGo: 'Downloading the zip…', zFail: 'Could not make the zip. Download the files one by one instead?', gOne: 'Download this file', gSubOne: 'Someone sent you a file with RoarTransfer.', gSubMany: function (n, t) { return 'Someone sent you ' + n + ' files with RoarTransfer · ' + t }, gGone: 'This transfer has expired', gGoneN: 'Files on RoarTransfer are kept 1 to 7 days. Ask for it to be sent again.',
      gBad: 'This link does not work', gBadN: 'Check that the whole link was copied.', gOff: 'Could not reach RoarTransfer', gOffN: 'Check the connection and try again.',
      find: 'Search by file or chat', findAdm: 'File, person, email or chat',
      tTransfers: 'transfers', tSent: 'sent in all', tActive: 'active now', tDownloads: 'downloads', tSenders: 'people sending',
      tStored: function (n) { return 'on the server now · ' + nf(n) + (n === 1 ? ' file' : ' files') }, tWeek: 'last 7 days', tBiggest: 'biggest file',
      chatLink: function (c, l) { return c + ' in chats · ' + l + ' by link' },
      opensN: function (n) { return nf(n) + (n === 1 ? ' open' : ' opens') }, dls: function (n) { return nf(n) + (n === 1 ? ' download' : ' downloads') },
      nTransfers: function (n) { return nf(n) + (n === 1 ? ' transfer' : ' transfers') },
      active: 'Active', expired: 'Expired', stoppedT: 'Deleted', deleted: 'Deleted in the chat',
      daysLeft: function (n) { return n + ' days left' }, hLeft: function (n) { return n + ' h left' }, minLeft: function (n) { return n + ' min left' },
      byLink: 'by link', group: 'a group', dm: 'a one-to-one chat',
      sel: 'Select', selN: function (n) { return n === 1 ? '1 selected' : n + ' selected' }, selAll: 'Select all', selNone: 'Clear', selX: 'Cancel', selDel: 'Delete',
      selAsk: function (n) { return 'Delete ' + (n === 1 ? 'this transfer' : 'these ' + n + ' transfers') + ' now? The files and their links are gone for good.' },
      stop: 'Delete', stopT: 'Delete the file and its link now',
      stopAsk: function (n) { return 'Delete "' + n + '" now? The file and its link are gone for good.' },
      noneYet: 'Nothing sent yet. What you send shows up here.', noneFound: 'Nothing matches.', noneAll: 'No transfers yet.',
      gNote: function (n) { return 'Up to 1 GB, for 24 hours' + (n == null ? '' : ' · ' + n + ' left today') + ' <a href="#" data-up class="gn-up">Sign up free</a>' },
      gOut: 'You used today\'s 3 free transfers. <a href="#" data-up>Sign up free</a> to keep sending, up to 5 GB.',
      limit: 'You used today\'s 3 free transfers. Sign up free to keep sending.',
      daily: 'A free account can send up to 15 GB a day. Go Pro for more, or send the rest tomorrow.',
      repAsk: 'Report this transfer: what is wrong with it? (optional)', repDone: 'Thanks, we will look at it.',
      only: 'Only', everyone: 'Everyone', guestN: 'Guest',
      stOf: 'of 10 GB free', stLeft: function (g) { return g + ' left' }, stOver: function (g) { return g + ' over the free 10 GB' }, stFiles: function (n) { return nf(n) + (n === 1 ? ' file' : ' files') }, stAcc: 'Accounts', stOther: 'Other', stOpen: function (n) { return nf(n) + ' unfinished ' + (n === 1 ? 'upload' : 'uploads') + ' (cleared in 7 days)' },
      stHint: function (c) { return 'Files delete themselves when their link ends (1 to 7 days), so this is about the last few days of uploads. Above 10 GB Cloudflare charges about $0.015 per GB a month: about $' + c + ' a month at today’s size.' },
      accSum: function (w7, sent, unc) { return nf(w7) + ' new this week · ' + nf(sent) + ' have sent · ' + nf(unc) + ' not confirmed yet' }, joined: 'Joined', unconfC: 'Not confirmed', lastSent: 'last sent', lastIn: 'last in', noAcc: 'No accounts yet.',
      rcOld: 'The request expired. Press Roar Account again.', rcBlocked: 'The browser blocked the new tab. Press Open the page again.', mfBad: 'That code is not right. Type the newest one from the app.', mfShort: 'Type the 6 digits.',
      wait: 'Too many tries. Wait a few minutes and try again.', badMail: 'This does not look like an email.', unconf: 'Confirm your email first: open the email we sent you.', forgotMail: 'Write your email above, then press Forgot password.', resetSent: 'If there is an account with this email, a link to choose a new password is on its way.', linkOld: 'This link has expired or was already used. Try again.', k_video: 'Video', k_image: 'Pictures', k_audio: 'Audio', k_other: 'Other'
    },
    el: {
      payFail: 'Το link έγινε αλλά δεν κλειδώθηκε. Άνοιξέ το στις Αποστολές μου και άναψε το Κλειδωμένο ως την πληρωμή.', goMail: 'Αποστολή', goLink: 'Πάρε το link', moreS: 'Τίτλος, μήνυμα, κωδικός', mTitle: 'τίτλος', mMsg: 'μήνυμα', mPw: 'κωδικός', mPay: 'κλειδωμένο ως την πληρωμή', mPc: 'pCloud',
      more: 'Πρόσθεσε κι άλλα', more2: 'ή άφησέ τα εδώ', of: function (g) { return 'από ' + g + ' GB' }, file: 'αρχείο', files: 'αρχεία', over: function (g) { return 'Πάνω από ' + g + ' GB' }, tooBig: function (g) { return 'πάνω από ' + g + ' GB' },
      to: 'Προς: email, χωρισμένα με κόμμα', title: 'Τίτλος (προαιρετικό)', msg: 'Το μήνυμά σου (προαιρετικό)', pw: 'Κωδικός (προαιρετικό)',
      noTo: 'Γράψε τουλάχιστον ένα email παραλήπτη.', badTo: function (e) { return 'Αυτό δεν μοιάζει με email: ' + e },
      mailed: function (n) { return n === 1 ? 'Στάλθηκε με email σε 1 άτομο.' : 'Στάλθηκε με email σε ' + n + ' άτομα.' }, unmailed: 'Κάποια email δεν στάλθηκαν:',
      gFrom: function (n) { return 'Από ' + n + ':' }, gLocked: 'Αυτή η αποστολή έχει κωδικό', gPw: 'Κωδικός', gOpen: 'Άνοιγμα', gWrong: 'Λάθος κωδικός, δοκίμασε ξανά.', gSlow: 'Πάρα πολλές λάθος προσπάθειες. Περίμενε 15 λεπτά και δοκίμασε ξανά.', gLeft: function (n) { return n === 1 ? 'απομένει 1 λήψη' : 'απομένουν ' + n + ' λήψεις' }, gUsed: 'Έφτασε το όριο λήψεων', gUsedN: 'Αυτό το αρχείο κατέβηκε όσες φορές επιτρέπεται. Ζήτα να σου το ξαναστείλουν.',
      until: 'ως', sent: 'ανέβηκαν', sentOne: 'Ανέβηκε!', sentMany: function (n) { return 'Ανέβηκαν ' + n + ' αρχεία!' }, none: 'Δεν ανέβηκε τίποτα',
      lmOpen: 'Άνοιγμα',
      left: 'Όποιος έχει τον σύνδεσμο μπορεί να κατεβάσει ως', copy: 'Αντιγραφή', copied: 'Αντιγράφηκε', allCopied: 'Αντιγράφηκαν όλοι', cant: 'Δεν αντιγράφηκε',
      bad: 'Λάθος email ή κωδικός.', offline: 'Δεν βρέθηκε το RoarTransfer. Έλεγξε τη σύνδεση και δοκίμασε ξανά.',
      inSub: 'Συνδέσου για να στέλνεις ως 5 GB, με link ή email.', upSub: 'Φτιάξε δωρεάν λογαριασμό για να στέλνεις αρχεία ως 5 GB.',
      inGo: 'Σύνδεση', upGo: 'Δημιουργία λογαριασμού', inQ: 'Δεν έχεις λογαριασμό;', upQ: 'Έχεις ήδη λογαριασμό;', inSw: 'Εγγραφή', upSw: 'Σύνδεση',
      upMail: 'Σχεδόν έτοιμο: άνοιξε το email που σου στείλαμε και πάτα Confirm my account. Σε φέρνει πίσω εδώ, συνδεδεμένο.', upShort: 'Ο κωδικός θέλει τουλάχιστον 6 χαρακτήρες.', upTaken: 'Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδέσου.',
      off: 'Το RoarTransfer δεν είναι ακόμα ανοιχτό σε αυτόν τον λογαριασμό.', stopped: 'Διακόπηκε.', leave: 'Τα αρχεία ανεβαίνουν ακόμα.',
      mailSub: 'Αρχεία για σένα (RoarTransfer)', mailBody: 'Κατέβασέ τα εδώ, ως', remove: 'Αφαίρεση',
      phSave: 'Αποθήκευση στις Φωτογραφίες', phPrep: function (p) { return 'Ετοιμάζεται… ' + p + '%' }, phReady: 'Πάτα για αποθήκευση στις Φωτογραφίες', phDone: 'Αποθηκεύτηκε; Ξανά', phFiles: 'Λήψη στα Αρχεία', phFail: 'Δεν ετοιμάστηκε για τις Φωτογραφίες. Να κατέβει στα Αρχεία;',
      gExpires: 'Λήγει', gGo: 'Λήψη', gAll: 'Λήψη όλων (.zip)', trialNoMail: 'Το Pro Trial μπήκε, αλλά το email δεν στάλθηκε.', zPrep: function (p) { return 'Φτιάχνεται το zip… ' + p + '%' }, zGo: 'Κατεβαίνει το zip…', zFail: 'Δεν έγινε το zip. Να κατέβουν τα αρχεία ένα ένα;', gOne: 'Λήψη αυτού του αρχείου', gSubOne: 'Κάποιος σου έστειλε ένα αρχείο με το RoarTransfer.', gSubMany: function (n, t) { return 'Κάποιος σου έστειλε ' + n + ' αρχεία με το RoarTransfer · ' + t }, gGone: 'Αυτή η αποστολή έληξε', gGoneN: 'Τα αρχεία στο RoarTransfer μένουν 1 με 7 μέρες. Ζήτα να σου το ξαναστείλουν.',
      gBad: 'Αυτός ο σύνδεσμος δεν δουλεύει', gBadN: 'Έλεγξε ότι αντιγράφηκε ολόκληρος ο σύνδεσμος.', gOff: 'Δεν βρέθηκε το RoarTransfer', gOffN: 'Έλεγξε τη σύνδεση και δοκίμασε ξανά.',
      find: 'Αναζήτηση σε αρχεία ή συνομιλίες', findAdm: 'Αρχείο, άτομο, email ή συνομιλία',
      tTransfers: 'αποστολές', tSent: 'στάλθηκαν συνολικά', tActive: 'ενεργές τώρα', tDownloads: 'λήψεις', tSenders: 'άτομα που στέλνουν',
      tStored: function (n) { return 'στον server τώρα · ' + nf(n) + (n === 1 ? ' αρχείο' : ' αρχεία') }, tWeek: 'τελευταίες 7 μέρες', tBiggest: 'το μεγαλύτερο αρχείο',
      chatLink: function (c, l) { return c + ' σε συνομιλίες · ' + l + ' με σύνδεσμο' },
      opensN: function (n) { return nf(n) + (n === 1 ? ' άνοιγμα' : ' ανοίγματα') }, dls: function (n) { return nf(n) + (n === 1 ? ' λήψη' : ' λήψεις') },
      nTransfers: function (n) { return nf(n) + (n === 1 ? ' αποστολή' : ' αποστολές') },
      active: 'Ενεργό', expired: 'Έληξε', stoppedT: 'Διαγράφηκε', deleted: 'Σβήστηκε στη συνομιλία',
      daysLeft: function (n) { return 'μένουν ' + n + ' μέρες' }, hLeft: function (n) { return 'μένουν ' + n + ' ώρες' }, minLeft: function (n) { return 'μένουν ' + n + ' λεπτά' },
      byLink: 'με σύνδεσμο', group: 'μια ομάδα', dm: 'μια προσωπική συνομιλία',
      sel: 'Επιλογή', selN: function (n) { return n === 1 ? '1 επιλεγμένο' : n + ' επιλεγμένα' }, selAll: 'Όλα', selNone: 'Κανένα', selX: 'Άκυρο', selDel: 'Διαγραφή',
      selAsk: function (n) { return 'Να σβηστ' + (n === 1 ? 'εί αυτή η αποστολή' : 'ούν αυτές οι ' + n + ' αποστολές') + ' τώρα; Τα αρχεία και τα links τους χάνονται οριστικά.' },
      stop: 'Διαγραφή', stopT: 'Σβήσε τώρα το αρχείο και τον σύνδεσμό του',
      stopAsk: function (n) { return 'Να σβηστεί το "' + n + '" τώρα; Το αρχείο και ο σύνδεσμός του χάνονται οριστικά.' },
      noneYet: 'Δεν έχεις στείλει τίποτα ακόμα. Ό,τι στέλνεις εμφανίζεται εδώ.', noneFound: 'Δεν βρέθηκε τίποτα.', noneAll: 'Καμία αποστολή ακόμα.',
      gNote: function (n) { return 'Ως 1 GB, για 24 ώρες' + (n == null ? '' : ' · ' + n + ' ακόμα σήμερα') + ' <a href="#" data-up class="gn-up">Δωρεάν εγγραφή</a>' },
      gOut: 'Χρησιμοποίησες τις 3 δωρεάν αποστολές της ημέρας. <a href="#" data-up>Κάνε δωρεάν εγγραφή</a> για να συνεχίσεις, ως 5 GB.',
      limit: 'Χρησιμοποίησες τις 3 δωρεάν αποστολές της ημέρας. Κάνε δωρεάν εγγραφή για να συνεχίσεις.',
      daily: 'Με δωρεάν λογαριασμό στέλνεις ως 15 GB τη μέρα. Γίνε Pro για περισσότερα ή στείλε τα υπόλοιπα αύριο.',
      repAsk: 'Αναφορά αυτής της αποστολής: τι πρόβλημα έχει; (προαιρετικό)', repDone: 'Ευχαριστούμε, θα το δούμε.',
      only: 'Μόνο', everyone: 'Όλοι', guestN: 'Επισκέπτης',
      stOf: 'από τα 10 GB δωρεάν', stLeft: function (g) { return 'μένουν ' + g }, stOver: function (g) { return g + ' πάνω από τα δωρεάν 10 GB' }, stFiles: function (n) { return nf(n) + (n === 1 ? ' αρχείο' : ' αρχεία') }, stAcc: 'Λογαριασμοί', stOther: 'Άλλα', stOpen: function (n) { return nf(n) + ' ημιτελή ανεβάσματα (σβήνονται σε 7 μέρες)' },
      stHint: function (c) { return 'Τα αρχεία σβήνονται μόνα τους όταν λήξει το link τους (1 με 7 μέρες), οπότε αυτό είναι περίπου τα ανεβάσματα των τελευταίων ημερών. Πάνω από 10 GB το Cloudflare χρεώνει περίπου $0.015 το GB τον μήνα: περίπου $' + c + ' τον μήνα με το σημερινό μέγεθος.' },
      accSum: function (w7, sent, unc) { return nf(w7) + ' νέοι αυτή την εβδομάδα · ' + nf(sent) + ' έχουν στείλει · ' + nf(unc) + ' δεν επιβεβαίωσαν ακόμα' }, joined: 'Εγγραφή', unconfC: 'Χωρίς επιβεβαίωση', lastSent: 'τελευταία αποστολή', lastIn: 'τελευταία σύνδεση', noAcc: 'Κανένας λογαριασμός ακόμα.',
      rcOld: 'Το αίτημα έληξε. Πάτα ξανά Roar Account.', rcBlocked: 'Ο browser μπλόκαρε τη νέα καρτέλα. Πάτα Άνοιξε ξανά τη σελίδα.', mfBad: 'Ο κωδικός δεν είναι σωστός. Γράψε τον πιο πρόσφατο από την εφαρμογή.', mfShort: 'Γράψε τα 6 ψηφία.',
      wait: 'Πολλές προσπάθειες. Περίμενε λίγα λεπτά και δοκίμασε ξανά.', badMail: 'Αυτό δεν μοιάζει με email.', unconf: 'Επιβεβαίωσε πρώτα το email σου: άνοιξε το email που σου στείλαμε.', forgotMail: 'Γράψε το email σου πάνω και πάτα Ξέχασα κωδικό.', resetSent: 'Αν υπάρχει λογαριασμός με αυτό το email, έρχεται σύνδεσμος για νέο κωδικό.', linkOld: 'Ο σύνδεσμος έληξε ή χρησιμοποιήθηκε ήδη. Δοκίμασε ξανά.', k_video: 'Βίντεο', k_image: 'Εικόνες', k_audio: 'Ήχος', k_other: 'Άλλα'
    }
  }
  var lang = 'en'
  // every count with its thousands mark (9,876), in the page's language
  function nf(n) { return Number(n || 0).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB') }
  var w = function (k) { return W[lang][k] }
  var $ = function (id) { return document.getElementById(id) }

  // the language: the one picked here before, else the browser's
  var nodes = [].slice.call(document.querySelectorAll('[data-t]'))
  var EN = {}
  nodes.forEach(function (n) { EN[n.dataset.t] = n.hasAttribute('data-html') ? n.innerHTML : n.textContent })
  function setLang(l) {
    lang = l === 'el' ? 'el' : 'en'
    var d = lang === 'el' ? EL : EN
    nodes.forEach(function (n) { var v = d[n.dataset.t]; if (v == null) v = EN[n.dataset.t]; if (n.hasAttribute('data-html')) n.innerHTML = v; else n.textContent = v })
    document.documentElement.lang = lang
    document.querySelectorAll('a.more:not(.studio)').forEach(function (a) { a.href = lang === 'el' ? 'el/' : 'about/' })
    document.querySelectorAll('.lang button').forEach(function (b) { b.classList.toggle('on', b.dataset.lang === lang) })
    try { localStorage.setItem('roartransfer.lang', lang) } catch (e) {}
    paint()
    paintPro(); paintAdmPro(); paintAs()
    if (typeof web !== 'undefined' && web) { paintWebTab(); paintWeb() }
  }
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang) }) })

  var day = function (ms) { return new Date(ms).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) }
  var hour = function (ms) { return new Date(ms).toLocaleTimeString(lang === 'el' ? 'el-GR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) }
  var size = function (n) { return n >= 1e12 ? (n / 1e12).toFixed(n >= 1e13 ? 1 : 2) + ' TB' : n > 1e9 ? (n / 1e9).toFixed(1) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round((n || 0) / 1e3)) + ' KB' }
  var icon = function (t) { return /^video\//.test(t) ? 'i-play' : /^image\//.test(t) ? 'i-img' : 'i-file' }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }

  // the same saved sign-in as RoarMe on this site (src/lib.js storageKey)
  var sb = window.supabase.createClient(URL_, KEY, { auth: { storageKey: 'roarme-auth-2', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  var user = null

  var views = ['v-wait', 'v-get', 'v-in', 'v-pw', 'v-drop', 'v-pick', 'v-up', 'v-done', 'v-mine', 'v-admin']
  // a download link (?t=…) shows only the file, signed in or not
  // roartransfer.com/<token> (Alex, 21 Oct: links as short as they can be; 404.html brings it here as ?t=) or ?t=<token>
  var getToken = new URLSearchParams(location.search).get('t') || (location.pathname.match(/^\/([A-Za-z0-9]{6,32})\/?$/) || [])[1] || ''
  var getting = /^[A-Za-z0-9]{6,32}$/.test(getToken)
  // a Pro's Receive-files page (Alex, 23 Oct): roartransfer.com/u/<name> (404.html brings it here as ?u=<name>)
  var dropSlug = getting ? '' : (new URLSearchParams(location.search).get('u') || (location.pathname.match(/^\/u\/([A-Za-z0-9-]{3,30})\/?$/) || [])[1] || '').toLowerCase()
  var dropping = /^[a-z0-9-]{3,30}$/.test(dropSlug)
  if (dropping && location.hostname === 'roartransfer.com' && location.search) try { history.replaceState(null, '', '/u/' + dropSlug + location.hash) } catch (e) {}
  // a download page is private: never in search results (Alex, 22 Oct: SEO for the rest of the site)
  if (getting) { var rb = document.querySelector('meta[name="robots"]'); if (rb) rb.content = 'noindex, nofollow' }
  // and the address bar shows the short one again
  if (getting && location.hostname === 'roartransfer.com' && location.search) try { history.replaceState(null, '', '/' + getToken + location.hash) } catch (e) {}
  var view = 'v-wait'
  // the Send tab remembers where it is (pick, sending, done), so an upload goes on while My transfers is open
  var SEND = { 'v-pick': 1, 'v-up': 1, 'v-done': 1 }
  var tab = 'send', sendView = 'v-pick', isAdmin = false
  // View as (Alex, 26 Oct): the admin sees the site as a Free or a Pro user would, in this tab until Back to Admin;
  // uploads made as Free are real Free ones (roartransfer-r2 takes `as: 'free'` only to lower, never to raise)
  var viewAs = ''
  try { viewAs = sessionStorage.getItem('rt-as') || '' } catch (e) {}
  if (viewAs !== 'free' && viewAs !== 'pro') viewAs = ''
  function show(v) {
    if (SEND[v]) { sendView = v; if (tab !== 'send') return }
    view = v
    views.forEach(function (id) { $(id).hidden = id !== v })
    $('who').hidden = !user || v === 'v-in' || v === 'v-pw' || dropping
    $('signin').hidden = !!user || v === 'v-in' || v === 'v-wait' || v === 'v-get' || dropping // a download page: only the logo, Studio and the language (Alex, 10 Nov)
    $('v-fast').hidden = v !== 'v-in'
    $('tabs').hidden = !user || v === 'v-in' || v === 'v-wait' || v === 'v-pw' || dropping
    document.querySelectorAll('#tabs [data-go]').forEach(function (b) { b.classList.toggle('on', b.dataset.go === tab) })
  }

  // ---- sign in ----
  var signUp = false
  function paintIn() {
    $('in-sub').textContent = w(signUp ? 'upSub' : 'inSub')
    $('in-go-t').textContent = w(signUp ? 'upGo' : 'inGo')
    $('in-q').textContent = w(signUp ? 'upQ' : 'inQ')
    $('in-switch').textContent = w(signUp ? 'upSw' : 'inSw')
    $('pw').autocomplete = signUp ? 'new-password' : 'current-password'
    $('nm-f').hidden = !signUp; $('in-forgot-p').hidden = signUp
    // the fields say what they are inside (no labels above them)
    ;['nm', 'em', 'pw'].forEach(function (id) { var l = document.querySelector('label[for="' + id + '"]'); if (l) $(id).placeholder = l.textContent })
  }
  $('in-switch').addEventListener('click', function (e) { e.preventDefault(); signUp = !signUp; $('in-err').hidden = true; $('in-ok').hidden = true; paintIn() })
  $('v-in').addEventListener('submit', function (e) {
    e.preventDefault()
    if (!$('mfa').hidden) { mfaVerify(); return }
    if ($('v-in').classList.contains('rc-on')) return
    var err = $('in-err'); err.hidden = true; $('in-ok').hidden = true
    var email = $('em').value.trim(), pass = $('pw').value
    if (signUp && pass.length < 6) { err.textContent = w('upShort'); err.hidden = false; return }
    $('in-go').disabled = true
    var done = function (r) {
      $('in-go').disabled = false
      if (r.error) {
        var m = r.error.message || ''
        err.textContent = /already|registered|exists/i.test(m) ? w('upTaken') : /not confirmed/i.test(m) ? w('unconf') : /invalid/i.test(m) ? w('bad') : /fetch|network/i.test(m) ? w('offline') : m
        err.hidden = false; return
      }
      // a new account that has to be confirmed by email first
      if (signUp && !(r.data && r.data.session)) { $('in-ok').textContent = w('upMail'); $('in-ok').hidden = false; signUp = false; paintIn() }
    }
    // a new account goes through RoarTransfer's own function: its email, its look, its link back here (?confirm=)
    var call = signUp
      ? authFn({ action: 'signup', email: email, password: pass, name: $('nm').value }).then(function (d) {
          return d.ok ? { data: { session: null } } : { error: { message: d.error === 'taken' ? 'already' : d.error === 'wait' ? w('wait') : d.error === 'email' ? w('badMail') : d.error || '' } }
        })
      : (gate = true, gated = false, sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) { if (r.error) ungate(); else afterIn(); return r }))
    call.then(done).catch(function () { ungate(); $('in-go').disabled = false; err.textContent = w('offline'); err.hidden = false })
  })

  // ---- Sign in with Roar Account (Alex, 3 Nov 2026: one sign-in for every Roar app) ----
  // roar-connect (RoarMe's project, verify_jwt off): start gives a code and a secret, the account page on themadlions.com
  // allows it in another tab, poll hands back a one-time token_hash, verifyOtp turns it into this page's own session
  var RC = URL_ + '/functions/v1/roar-connect', rc = null
  function rcCall(body) {
    return fetch(RC, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { error: 'Error ' + r.status } }) })
  }
  function rcMode(on, which) {
    $('v-in').classList.toggle('rc-on', !!on)
    $('v-in').noValidate = !!on // the hidden email fields must not stop the code's Verify
    $('rc-wait').hidden = !(on && which === 'wait')
    $('mfa').hidden = !(on && which === 'mfa')
  }
  function rcStop() { if (rc) { clearTimeout(rc.timer); rc.stopped = true } rc = null }
  function rcFail(msg) { rcStop(); rcMode(false); $('rc-go').disabled = false; var e = $('in-err'); e.textContent = msg; e.hidden = false }
  $('rc-go').addEventListener('click', function () {
    if (rc) return
    $('in-err').hidden = true; $('in-ok').hidden = true; $('rc-err').hidden = true
    // the tab opens now, from the click, so the browser does not block it; it gets its address when the code is back
    var tw = null
    try { tw = window.open('', '_blank') } catch (e) {}
    $('rc-go').disabled = true
    var me = rc = { stopped: false, timer: 0 }
    rcCall({ do: 'start', app: 'roartransfer' }).then(function (d) {
      if (me.stopped) { if (tw) tw.close(); return }
      if (!d || !d.code || !d.secret || !d.url) { if (tw) tw.close(); rcFail(d && d.error ? String(d.error) : w('offline')); return }
      me.code = d.code; me.secret = d.secret; me.url = d.url; me.until = Date.now() + (d.expires_in || 600) * 1000
      if (tw) { try { tw.location.href = d.url } catch (e) { tw = null } }
      $('rc-code').textContent = d.code
      if (!tw) { $('rc-err').textContent = w('rcBlocked'); $('rc-err').hidden = false }
      rcMode(true, 'wait')
      me.timer = setTimeout(poll, 2000)
    }).catch(function () { if (tw) tw.close(); if (!me.stopped) rcFail(w('offline')) })
    function poll() {
      if (me.stopped) return
      if (Date.now() > me.until) { rcFail(w('rcOld')); return }
      rcCall({ do: 'poll', code: me.code, secret: me.secret }).then(function (d) {
        if (me.stopped) return
        if (d && d.token_hash) {
          rcStop()
          gate = true; gated = false
          sb.auth.verifyOtp({ type: 'magiclink', token_hash: d.token_hash }).then(function (r) {
            if (r.error) { ungate(); rcFail(r.error.message || w('rcOld')); return }
            $('rc-go').disabled = false; rcMode(false); afterIn()
          }).catch(function () { ungate(); rcFail(w('offline')) })
          return
        }
        if (d && d.expired) { rcFail(w('rcOld')); return }
        me.timer = setTimeout(poll, 2000)
      }).catch(function () { if (!me.stopped) me.timer = setTimeout(poll, 2000) })
    }
  })
  $('rc-again').addEventListener('click', function () {
    if (!rc || !rc.url) return
    var t = null
    try { t = window.open(rc.url, '_blank') } catch (e) {}
    $('rc-err').hidden = !!t
  })
  $('rc-x').addEventListener('click', function () {
    var c = rc; rcStop(); rcMode(false); $('rc-go').disabled = false
    if (c && c.code) rcCall({ do: 'deny', code: c.code }).catch(function () {})
  })
  // signed in (aal1): an account with a verified authenticator still needs its 6-digit code before the page goes on
  function afterIn() {
    sb.auth.mfa.getAuthenticatorAssuranceLevel().then(function (a) {
      var l = a && a.data
      if (l && l.nextLevel === 'aal2' && l.currentLevel !== 'aal2') {
        $('mfa-c').value = ''; $('mfa-err').hidden = true; $('in-err').hidden = true; rcMode(true, 'mfa'); $('mfa-c').focus()
      } else ungate()
    }).catch(function () { ungate() })
  }
  function ungate() {
    if (!gate) return
    gate = false
    if (gated) { gated = false; sb.auth.getSession().then(function (r) { onAuth('SIGNED_IN', r.data.session) }) }
  }
  async function mfaVerify() {
    var c = $('mfa-c').value.replace(/\D/g, ''), e = $('mfa-err'); e.hidden = true
    if (c.length !== 6) { e.textContent = w('mfShort'); e.hidden = false; return }
    $('mfa-go').disabled = true
    try {
      var f = await sb.auth.mfa.listFactors()
      var t = ((f.data && f.data.totp) || []).filter(function (x) { return x.status === 'verified' })[0]
      if (!t) { rcMode(false); ungate(); return }
      var r = await sb.auth.mfa.challengeAndVerify({ factorId: t.id, code: c })
      if (r.error) { e.textContent = /invalid|expired|code/i.test(r.error.message || '') ? w('mfBad') : r.error.message; e.hidden = false; $('mfa-c').select(); return }
      rcMode(false); ungate()
    } catch (x) { e.textContent = w('offline'); e.hidden = false } finally { $('mfa-go').disabled = false }
  }
  $('mfa-x').addEventListener('click', function () { rcMode(false); gate = false; gated = false; $('pw').value = ''; sb.auth.signOut() })
  function authFn(body) {
    return fetch(URL_ + '/functions/v1/roartransfer-auth', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { error: 'Error ' + r.status } }) })
  }
  $('in-forgot').addEventListener('click', function (e) {
    e.preventDefault()
    var err = $('in-err'), email = $('em').value.trim(); err.hidden = true; $('in-ok').hidden = true
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { err.textContent = w('forgotMail'); err.hidden = false; $('em').focus(); return }
    authFn({ action: 'reset', email: email }).then(function (d) {
      if (d.ok) { $('in-ok').textContent = w('resetSent'); $('in-ok').hidden = false } else { err.textContent = d.error === 'wait' ? w('wait') : w('offline'); err.hidden = false }
    }).catch(function () { err.textContent = w('offline'); err.hidden = false })
  })
  // the links in RoarTransfer's own emails: ?confirm= signs in the new account, ?reset= asks for a new password
  var qs = new URLSearchParams(location.search), confirmT = qs.get('confirm'), resetT = qs.get('reset')
  if (confirmT || resetT) try { history.replaceState(null, '', location.pathname) } catch (e) {}
  if (confirmT) sb.auth.verifyOtp({ token_hash: confirmT, type: 'signup' }).then(function (r) {
    if (r.error) { show('v-in'); $('in-err').textContent = w('linkOld'); $('in-err').hidden = false }
  })
  if (resetT) sb.auth.verifyOtp({ token_hash: resetT, type: 'recovery' }).then(function (r) {
    if (r.error) { show('v-in'); $('in-err').textContent = w('linkOld'); $('in-err').hidden = false } else { resetting = true; show('v-pw'); $('npw').focus() }
  })
  var resetting = !!resetT
  $('v-pw').addEventListener('submit', function (e) {
    e.preventDefault()
    var p = $('npw').value; $('pw-err').hidden = true
    if (p.length < 6) { $('pw-err').textContent = w('upShort'); $('pw-err').hidden = false; return }
    $('pw-go').disabled = true
    sb.auth.updateUser({ password: p }).then(function (r) {
      $('pw-go').disabled = false
      if (r.error) { $('pw-err').textContent = r.error.message; $('pw-err').hidden = false; return }
      resetting = false; $('npw').value = ''; signedIn()
    })
  })
  $('out').addEventListener('click', function () { if (busy) return; sb.auth.signOut() })
  // while a sign-in waits for its two-step code (or for the check whether it needs one), the page stays signed out
  var gate = false, gated = false
  sb.auth.onAuthStateChange(function (ev, session) { if (gate) { gated = true; return } onAuth(ev, session) })
  function onAuth(ev, session) {
    if (getting || dropping) {
      user = session && session.user || null
      // signed in from an ended link: back to it, now with the one last download
      if (getting && user && view === 'v-in') { try { localStorage.removeItem('rt-grace') } catch (x) {} show('v-get'); load() }
      return
    }
    var was = user && user.id
    user = session && session.user || null
    $('who-mail').textContent = user ? user.email || '' : ''
    if (!user) { pro = proMe = null; if (admPro) admPro.list = null; paintPro(); isAdmin = false; $('as-bar').hidden = true; mine = null; adm.stats = adm.list = adm.who = adm.acc = adm.usage = null; $('tab-admin').hidden = true; tab = 'send'; if (!busy) show('v-in'); loadGuest() }
    else if (resetting) { $('who').hidden = true }
    else if (view === 'v-wait' || view === 'v-in' || was !== user.id) { $('pw').value = ''; signedIn() }
    else $('who').hidden = false
  }
  sb.auth.getSession().then(function (r) { if (!r.data.session && !getting && !dropping) { show('v-in'); loadGuest() } })
  // without an account: how many of today's transfers are left
  function loadGuest() { if (user) return; bridge({ action: 'guest' }).then(function (d) { guestLeft = d.left; paint() }).catch(function () {}) }
  // one last download (Alex, 26 Oct): to sign up or in from an ended link, and back to it afterwards (also after the
  // email that confirms a new account, which lands on the home page)
  $('get-grace').addEventListener('click', function (e) {
    var up = e.target.closest('[data-gup]'), inn = e.target.closest('[data-gin]')
    if (!up && !inn) return
    try { localStorage.setItem('rt-grace', JSON.stringify({ t: getToken, at: Date.now() })) } catch (x) {}
    toIn(!!up)
  })
  function graceBack() {
    try {
      var g = JSON.parse(localStorage.getItem('rt-grace') || 'null')
      localStorage.removeItem('rt-grace')
      if (g && /^[A-Za-z0-9]{6,32}$/.test(g.t || '') && Date.now() - g.at < 864e5) { location.replace(PAGE.replace(/\/$/, '') + '/' + g.t); return true }
    } catch (x) {}
    return false
  }
  function toIn(up) { signUp = !!up; $('in-err').hidden = true; $('in-ok').hidden = true; paintIn(); show('v-in') }
  $('signin').addEventListener('click', function () { if (!busy) toIn(false) })
  $('in-guest').addEventListener('click', function (e) { e.preventDefault(); show('v-pick'); paint() })
  $('guest-n').addEventListener('click', function (e) { if (e.target.closest('[data-up]')) { e.preventDefault(); if (!busy) toIn(true) } })

  // ---- More options: folded, with a line of what is set inside (Alex, 10 Nov) ----
  function paintMore() {
    var set = []
    if ($('op-title').value.trim()) set.push(w('mTitle'))
    if ($('op-msg').value.trim()) set.push(w('mMsg'))
    if ($('op-pw').value) set.push(w('mPw'))
    if (!$('op-pay-row').hidden && $('op-pay').checked) set.push(w('mPay'))
    if (!$('op-pc-row').hidden && $('op-pc').checked) set.push(w('mPc'))
    $('op-more-s').textContent = set.length ? set.join(' · ') : w('moreS')
    $('op-more-s').classList.toggle('on', set.length > 0)
  }
  $('op-more').addEventListener('click', function () {
    var open = $('op-more-b').hidden
    $('op-more-b').hidden = !open; $('op-more').setAttribute('aria-expanded', open ? 'true' : 'false'); $('op-more').classList.toggle('open', open)
  })
  ;['op-title', 'op-msg', 'op-pw'].forEach(function (id) { $(id).addEventListener('input', paintMore) })
  ;['op-pay', 'op-pc'].forEach(function (id) { $(id).addEventListener('change', paintMore) })

  // ---- pick ----
  var files = []
  var total = function () { return files.reduce(function (n, f) { return n + f.size }, 0) }
  function add(list) {
    [].slice.call(list || []).forEach(function (f) { if (!files.some(function (x) { return x.name === f.name && x.size === f.size })) files.push(f) })
    paint()
  }
  function paint() {
    var MAX = lim()
    var t = total(), over = t > MAX, has = files.length > 0
    $('opts').hidden = !has
    var g = !user
    if (g && mode === 'mail') { mode = 'link'; $('mode').querySelectorAll('[data-m]').forEach(function (x) { x.classList.toggle('on', x.dataset.m === 'link') }) }
    $('mode').hidden = g; $('dur').hidden = g; document.querySelectorAll('.eco').forEach(function (x) { x.hidden = g }); $('op-notify').parentNode.hidden = g
    // Pro (Alex, 25 Oct): a fourth length, 30 days, each length with its own size (PRO_GB), downloads without limit
    var P = isProNow(), D = lang === 'el' ? EL : EN
    // Locked until paid when sending (Pro): set right after the link is made (roartransfer-pro 'edit')
    $('op-pay-row').hidden = !P; if (!P) $('op-pay').checked = false
    $('d30').hidden = !P; $('dur').classList.toggle('four', P)
    if (!P && DAYS === 30) { DAYS = 1; $('dur').querySelectorAll('[data-d]').forEach(function (x) { x.classList.toggle('on', x.dataset.d === '1') }) }
    $('dur').querySelectorAll('small[data-t]').forEach(function (x) { x.textContent = P ? (lang === 'el' ? 'ως ' : 'up to ') + PRO_GB[x.closest('[data-d]').dataset.d] + ' GB' : (D[x.dataset.t] || EN[x.dataset.t]) })
    $('op-eco').hidden = g || P
    document.querySelector('.eco.dl span').textContent = P ? pw('pkDl') + '.' : (D['op.dls'] || EN['op.dls'])
    $('guest-n').hidden = !g; $('guest-n').classList.toggle('out', g && guestLeft === 0)
    if (g) $('guest-n').innerHTML = guestLeft === 0 ? w('gOut') : w('gNote')(guestLeft)
    $('op-to').hidden = mode !== 'mail'
    $('op-to').placeholder = w('to'); $('op-title').placeholder = w('title'); $('op-msg').placeholder = w('msg'); $('op-pw').placeholder = w('pw')
    $('drop').classList.toggle('has', has)
    $('drop-b').textContent = has ? w('more') : (lang === 'el' ? EL['pk.drop'] : EN['pk.drop'])
    $('drop-s').textContent = has ? w('more2') : (lang === 'el' ? EL['pk.or'] : EN['pk.or'])
    $('list').hidden = !has; $('meter').hidden = !has; $('go').hidden = !has; $('go-agree').hidden = !has
    $('list').innerHTML = files.map(function (f, n) {
      return '<li><span class="fi"><svg><use href="#' + icon(f.type) + '"/></svg></span><span class="ft"><b>' + esc(f.name) + '</b><small' + (f.size > MAX ? ' class="bad"' : '') + '>' + size(f.size) + (f.size > MAX ? ' · ' + w('tooBig')(limG()) : '') + '</small></span>'
        + '<button type="button" class="x" data-n="' + n + '" aria-label="' + w('remove') + '"><svg><use href="#i-x"/></svg></button></li>'
    }).join('')
    $('meter').classList.toggle('over', over)
    $('meter-i').style.width = Math.min(100, t / MAX * 100) + '%'
    $('meter-t').innerHTML = '<b>' + size(t) + '</b> ' + w('of')(limG()) + ' · ' + files.length + ' ' + (files.length === 1 ? w('file') : w('files'))
    $('go').disabled = over
    $('go-t').textContent = over ? w('over')(limG()) : mode === 'mail' ? w('goMail') : w('goLink')
    // the steps' words only when there is a choice to make (a guest has neither)
    $('st-how').hidden = g; $('st-long').hidden = g
    paintMore()
    if (view === 'v-done') paintDone()
    if (view === 'v-mine') { paintMine(); paintPro() }
    if (view === 'v-drop') paintDrop()
    if (view === 'v-admin') { paintStats(); paintStore(); paintAcc(); paintAdmList() }
    if (view === 'v-get') paintGet()
    paintIn()
  }
  $('list').addEventListener('click', function (e) { var b = e.target.closest('.x'); if (b) { files.splice(+b.dataset.n, 1); paint() } })
  $('mode').addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]'); if (!b) return
    mode = b.dataset.m
    $('mode').querySelectorAll('[data-m]').forEach(function (x) { x.classList.toggle('on', x === b) })
    $('op-err').hidden = true; paint()
    if (mode === 'mail') $('op-to').focus()
  })
  $('dur').addEventListener('click', function (e) {
    var b = e.target.closest('[data-d]'); if (!b) return
    DAYS = +b.dataset.d
    $('dur').querySelectorAll('[data-d]').forEach(function (x) { x.classList.toggle('on', x === b) })
    paint()
  })
  $('op-to').addEventListener('input', function () { $('op-err').hidden = true })
  $('op-eye').addEventListener('click', function () { $('op-pw').type = $('op-pw').type === 'password' ? 'text' : 'password' })
  var emails = function () { return $('op-to').value.split(/[\s,;]+/).map(function (e) { return e.trim() }).filter(Boolean) }
  $('drop').addEventListener('click', function () { $('pick').click() })
  $('pick').addEventListener('change', function (e) { add(e.target.files); e.target.value = '' })
  var drop = $('drop')
  ;['dragenter', 'dragover'].forEach(function (k) { drop.addEventListener(k, function (e) { e.preventDefault(); drop.classList.add('over') }) })
  drop.addEventListener('dragleave', function () { drop.classList.remove('over') })
  drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); add(e.dataTransfer && e.dataTransfer.files) })
  // a file dropped anywhere on the page counts too, instead of the browser opening it
  window.addEventListener('dragover', function (e) { e.preventDefault() })
  window.addEventListener('drop', function (e) { e.preventDefault(); if (view === 'v-pick') add(e.dataTransfer && e.dataTransfer.files); else if (view === 'v-drop' && !inb.done && !inb.gone) dropAdd(e.dataTransfer && e.dataTransfer.files) })

  // ---- send: each file in 16 MB pieces straight to Cloudflare R2, three at a time; a piece that fails is tried again ----
  var busy = false, stopped = false, xhrs = [], link = '', mailed = 0
  var sent = [], errs = []
  var C = 2 * Math.PI * 56
  $('ring').style.strokeDasharray = C
  function progress(done) {
    var t = total(), p = t ? Math.min(1, done / t) : 0
    $('ring').style.strokeDashoffset = C * (1 - p)
    $('pct').textContent = Math.round(p * 100) + '%'
    $('up-t').textContent = size(done) + ' / ' + size(t) + ' · ' + sent.length + ' / ' + files.length + ' ' + w('sent')
  }
  // a call to the bridge, signed in
  async function bridge(body) {
    var r0 = await sb.auth.getSession(); var s0 = r0.data.session
    // without an account the bridge still answers, within the free limits
    var hd = { apikey: KEY, 'Content-Type': 'application/json' }
    if (s0) hd.Authorization = 'Bearer ' + s0.access_token
    if (viewAs === 'free') body = Object.assign({ as: 'free' }, body)
    var r = await fetch(FN, { method: 'POST', headers: hd, body: JSON.stringify(body) })
    var d = {}; try { d = await r.json() } catch (e) {}
    if (!r.ok) throw Object.assign(new Error(d.limit ? w('limit') : d.daily ? w('daily') : d.error === 'signed-out' ? 'signed-out' : d.error || ('Error ' + r.status)), { fatal: r.status < 500, limit: !!d.limit, daily: !!d.daily })
    return d
  }
  function put(url, body, onUp) {
    return new Promise(function (ok, no) {
      if (stopped) { no(new Error('cancelled')); return }
      var x = new XMLHttpRequest()
      xhrs.push(x)
      var drop = function () { xhrs = xhrs.filter(function (y) { return y !== x }) }
      x.open('PUT', url)
      x.upload.onprogress = function (e) { onUp(e.loaded) }
      x.onload = function () { drop(); ok(x) }
      x.onerror = function () { drop(); no(new Error('offline')) }
      x.onabort = function () { drop(); no(new Error('cancelled')) }
      x.send(body)
    })
  }
  var wait = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms) }) }
  async function upOne(f, before) {
    // Pro (Alex, 25 Oct): an upload cut off (no connection, the page closed) goes on from the last finished piece when
    // the same file is sent again within 20 hours; meanwhile it waits for the connection instead of failing
    var resume = isProNow() && !dropping, fp = 'rt-up:' + [f.name, f.size, f.lastModified, DAYS].join('|'), saved = null
    if (resume) { try { saved = JSON.parse(localStorage.getItem(fp) || 'null') } catch (e) {} }
    if (saved && (!saved.key || Date.now() - saved.t > 20 * 36e5)) saved = null
    var made = saved ? { key: saved.key, uploadId: saved.uploadId } : await bridge({ action: 'create', name: f.name || 'file', size: f.size, type: f.type || '', days: DAYS, inbox: dropping ? dropSlug : undefined })
    var n = Math.max(1, Math.ceil(f.size / PART)), next = 1
    var urls = {}, etags = saved ? saved.etags || {} : {}, loaded = {}
    for (var k0 in etags) loaded[k0] = Math.min(PART, f.size - (k0 - 1) * PART)
    var keep = function () { if (resume) try { localStorage.setItem(fp, JSON.stringify({ key: made.key, uploadId: made.uploadId, etags: etags, t: saved ? saved.t : Date.now() })) } catch (e) {} }
    var forget = function () { try { localStorage.removeItem(fp) } catch (e) {} }
    keep()
    var sum = function () { var t = 0; for (var k in loaded) t += loaded[k]; return t }
    var signing = null // one signing request at a time, for the next 20 pieces
    async function urlFor(i) {
      while (!urls[i]) {
        if (!signing) {
          var want = []
          for (var k = i; k <= Math.min(n, i + 19); k++) if (!urls[k] && !etags[k]) want.push(k)
          signing = bridge({ action: 'sign', key: made.key, uploadId: made.uploadId, parts: want, inbox: dropping ? dropSlug : undefined })
            .then(function (got) { for (var q in got.urls) urls[q] = got.urls[q] })
            .finally(function () { signing = null })
        }
        await signing
      }
      return urls[i]
    }
    async function worker() {
      for (;;) {
        if (stopped) throw new Error('cancelled')
        var i = next++
        if (i > n) return
        if (etags[i]) continue
        var from = (i - 1) * PART, piece = f.slice(from, Math.min(from + PART, f.size)), tries = 0
        for (;;) {
          try {
            var r = await put(await urlFor(i), piece, function (x) { loaded[i] = x; progress(before + sum()) })
            if (r.status >= 200 && r.status < 300) { etags[i] = r.getResponseHeader('ETag') || ''; loaded[i] = piece.size; progress(before + sum()); keep(); break }
            if (r.status === 403) delete urls[i] // its signature ran out: sign it again
            throw new Error('Upload failed (' + r.status + ')')
          } catch (e) {
            if (stopped || e.message === 'cancelled' || e.fatal) throw e
            loaded[i] = 0
            if (resume && !navigator.onLine) { await new Promise(function (ok) { window.addEventListener('online', ok, { once: true }) }); tries = 0; continue }
            if (++tries > (resume ? 20 : 6)) throw e
            await wait(Math.min(30000, 1000 * Math.pow(2, tries)))
          }
        }
      }
    }
    try { await Promise.all([worker(), worker(), worker()]) } catch (e) {
      // a kept upload whose pieces can no longer be signed (it was cleared): start this file afresh
      if (saved && e.fatal && !stopped) { forget(); return upOne(f, before) }
      if (stopped || !resume) { forget(); bridge({ action: 'abort', key: made.key, uploadId: made.uploadId, inbox: dropping ? dropSlug : undefined }).catch(function () {}) }
      throw e
    }
    var parts = Object.keys(etags).map(function (k) { return { n: +k, etag: etags[k] } })
    var fin
    try { fin = await bridge({ action: 'complete', key: made.key, uploadId: made.uploadId, parts: parts, name: f.name || 'file', size: f.size, type: f.type || '', days: DAYS, inbox: dropping ? dropSlug : undefined }) } catch (e) {
      if (saved && e.fatal) { forget(); return upOne(f, before) }
      throw e
    }
    forget()
    return { name: f.name, size: fin.size || f.size, type: f.type, token: fin.token, url: PAGE + fin.token, expires: fin.expires }
  }
  // the link's preview picture (Alex, 25 Oct): a frame of the first video, else the first picture, cropped to 1200x630
  // with a round play sign on a video, so the link shows it in WhatsApp, Messenger, iMessage, Slack… (roartransfer-r2
  // keeps it as og/<token>.jpg, never with a password; cloudflare/worker.js puts it in the link's Open Graph tags)
  function makeCover(list) {
    var f = list.filter(function (x) { return /^video\//.test(x.type) })[0] || list.filter(function (x) { return /^image\/(jpeg|png|webp|gif|avif)$/.test(x.type) })[0]
    if (!f) return Promise.resolve('')
    return new Promise(function (ok) {
      var src = URL.createObjectURL(f), done = false
      var end = function (v) { if (done) return; done = true; URL.revokeObjectURL(src); ok(v || '') }
      setTimeout(end, 15000)
      // the picture, cropped to 1200x630; how dark it is (0 to 255), so a black frame can be passed over
      var paint = function (el, w0, h0) {
        var W = 1200, H = 630, c = document.createElement('canvas'), g = c.getContext('2d'), k = Math.max(W / w0, H / h0)
        c.width = W; c.height = H
        g.fillStyle = '#111'; g.fillRect(0, 0, W, H)
        g.drawImage(el, (W - w0 * k) / 2, (H - h0 * k) / 2, w0 * k, h0 * k)
        var d = g.getImageData(0, 0, W, H).data, sum = 0, n = 0
        for (var i = 0; i < d.length; i += 4 * 97) { sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; n++ }
        return { c: c, light: n ? sum / n : 0 }
      }
      var finish = function (c, play) {
        try {
          var g = c.getContext('2d'), W = c.width, H = c.height
          if (play) {
            g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(W / 2, H / 2, 64, 0, Math.PI * 2); g.fill()
            g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.stroke()
            g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2 - 18, H / 2 - 28); g.lineTo(W / 2 + 30, H / 2); g.lineTo(W / 2 - 18, H / 2 + 28); g.closePath(); g.fill()
          }
          end(c.toDataURL('image/jpeg', 0.82))
        } catch (e) { end('') }
      }
      if (!/^video\//.test(f.type)) {
        var im = new Image()
        im.onload = function () { try { im.naturalWidth ? finish(paint(im, im.naturalWidth, im.naturalHeight).c) : end('') } catch (e) { end('') } }
        im.onerror = function () { end('') }
        im.src = src
        return
      }
      // Alex, 25 Oct: not the first frame (most videos open on black) but the 20th, about 0.8 s in; if that one is
      // still black (a fade in), a little further on (2, 4, 8 seconds, a third of the way), else the brightest one seen
      var v = document.createElement('video'), at = [], best = null
      v.muted = true; v.playsInline = true; v.preload = 'auto'
      // nothing but the dark backdrop (the browser never drew the frame): the general RoarTransfer card instead
      var next = function () { at.length ? (v.currentTime = at.shift()) : best && best.light >= 22 ? finish(best.c, true) : end('') }
      v.onloadedmetadata = function () {
        var d = isFinite(v.duration) && v.duration > 0 ? v.duration : 10
        at = [0.8, 2, 4, 8, d / 3].filter(function (t) { return t < d })
        if (!at.length) at = [d / 2]
        // a moment of muted play makes Safari decode pictures at all; then the seeks
        var go = function () { try { v.pause() } catch (e) {} next() }
        try { var pl = v.play(); pl && pl.then ? pl.then(go, go) : go() } catch (e) { go() }
      }
      // the frame is drawn only once the browser has shown it after the seek (Safari otherwise gives the old one)
      v.onseeked = function () {
        var once = false
        var take = function () {
          if (once) return; once = true
          try {
            if (!v.videoWidth) return end('')
            var p = paint(v, v.videoWidth, v.videoHeight)
            if (p.light >= 40) return finish(p.c, true)
            if (!best || p.light > best.light) best = p
            next()
          } catch (e) { end('') }
        }
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(take)
        setTimeout(take, 400)
      }
      v.onerror = function () { end('') }
      v.src = src
    })
  }
  $('go').addEventListener('click', async function () {
    if (!files.length || total() > lim() || busy) return
    // by email: at least one address, and all of them must look right
    $('op-err').hidden = true
    if (mode === 'mail') {
      var list = emails(), bad = list.filter(function (e) { return !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) })
      if (!list.length || bad.length) { $('op-err').textContent = !list.length ? w('noTo') : w('badTo')(bad[0]); $('op-err').hidden = false; return }
    }
    busy = true; stopped = false; sent = []; errs = []
    $('up-n').classList.remove('warn')
    show('v-up'); progress(0)
    var coverP = $('op-pw').value || dropping ? Promise.resolve('') : makeCover(files.slice())
    var before = 0
    for (var i = 0; i < files.length; i++) {
      if (stopped) break
      var f = files[i]
      try { sent.push(await upOne(f, before)) } catch (e) {
        if (stopped || e.message === 'cancelled') break
        if (e.limit) { errs.push(e.message); guestLeft = 0; break }
        // a Free account's 15 GB a day (Alex, 26 Oct): the files that fit went, the rest wait for tomorrow
        if (e.daily) { errs.push(e.message); break }
        errs.push(f.name + ': ' + (e.message === 'offline' ? w('offline') : e.message === 'signed-out' ? w('bad') : e.message))
      }
      before += f.size; progress(before)
    }
    // one link for everything that went up, one file or many
    link = ''; mailed = 0
    if (sent.length) {
      try {
        var bun = await bridge({ action: 'bundle', tokens: sent.map(function (m) { return m.token }), title: $('op-title').value, message: $('op-msg').value,
          recipients: mode === 'mail' ? emails() : [], password: $('op-pw').value, notify: $('op-notify').checked, payLock: isProNow() && $('op-pay').checked,
          cover: await Promise.race([coverP, wait(3000).then(function () { return '' })]) || undefined })
        link = PAGE + bun.token
        mailed = bun.mailed || 0
        // Locked until paid, ticked when sending: the link and its files locked at once (as Details does)
        if (isProNow() && $('op-pay').checked && !bun.payLock) {
          try { await proCall({ action: 'edit', token: sent[0].token, payLock: true }) } catch (e) { errs.push(w('payFail')) }
        }
        if (bun.mailErrors && bun.mailErrors.length) errs.push(w('unmailed') + ' ' + bun.mailErrors.join(', '))
      }
      catch (e) { if (sent.length === 1) link = sent[0].url; else errs.push(e.message) }
    }
    busy = false
    loadGuest()
    if (isAdmin && $('op-pc').checked && sent.length && !stopped) toPcloud(sent.slice())
    if (stopped && !sent.length) { show('v-pick'); paint(); return }
    if (stopped) errs.push(w('stopped'))
    show('v-done'); paintDone()
  })
  $('stop').addEventListener('click', function () { stopped = true; xhrs.slice().forEach(function (x) { x.abort() }) })
  window.addEventListener('beforeunload', function (e) { if (busy || pcBusy) { e.preventDefault(); e.returnValue = w('leave') } })

  // ---- only in my pCloud (Alex, 22 Oct; the admin alone) ----
  // the files went up to R2 as usual; pCloud now fetches each one itself (Edge Function roar-pcloud, through the hub),
  // and once a file is whole in pCloud its link points there and the copy in R2 is deleted. The page stays open meanwhile.
  var pcBusy = false
  try { $('op-pc').addEventListener('change', function () { try { localStorage.setItem('rt-pcloud', $('op-pc').checked ? '1' : '0') } catch (e) {} }) } catch (e) {}
  function pcNote(t, bad) { var n = $('done-pc'); n.hidden = !t; n.textContent = t || ''; n.classList.toggle('ok', !bad && /^(In|Στο)/.test(t)); n.classList.toggle('err', !!bad) }
  async function pcCall(body) {
    var r = await sb.functions.invoke('roar-pcloud', { body: body })
    var d = r.data || {}
    if (r.error && !d.error) { try { d = await r.error.context.json() } catch (e) { d = { error: r.error.message } } }
    if (d.error) throw new Error(d.error)
    return d
  }
  async function toPcloud(list) {
    pcBusy = true
    var el = lang === 'el', where = ''
    pcNote(el ? 'Μεταφέρεται στο pCloud σου… άφησε τη σελίδα ανοιχτή.' : 'Moving it to your pCloud… keep this page open.')
    try {
      for (var i = 0; i < list.length; i++) where = (await pcCall({ token: list[i].token })).path || where
      var left = list.map(function (m) { return m.token }), until = Date.now() + 60 * 60e3
      while (left.length && Date.now() < until) {
        await new Promise(function (ok) { setTimeout(ok, 6000) })
        for (var k = left.length - 1; k >= 0; k--) { var c = await pcCall({ action: 'check', token: left[k], only: true }); if (c.done) left.splice(k, 1) }
        if (left.length) pcNote((el ? 'Μεταφέρεται στο pCloud σου… ' : 'Moving it to your pCloud… ') + (list.length - left.length) + '/' + list.length)
      }
      if (left.length) throw new Error(el ? 'Το pCloud αργεί. Το link δουλεύει κανονικά από το RoarTransfer.' : 'pCloud is taking long. The link still works from RoarTransfer.')
      pcNote((el ? 'Στο pCloud σου μόνο: ' : 'In your pCloud only: ') + String(where).replace(/^\//, '').replace(/\/[^/]*$/, ''))
    } catch (e) { pcNote('pCloud: ' + e.message, true) }
    pcBusy = false
  }

  // ---- done ----
  function paintDone() {
    var ok = sent.length > 0
    $('done-ic').classList.toggle('fail', !ok)
    $('done-ic').innerHTML = '<svg><use href="#' + (ok ? 'i-check' : 'i-x') + '"/></svg>'
    $('done-h').textContent = !ok ? w('none') : sent.length === 1 ? w('sentOne') : w('sentMany')(sent.length)
    $('done-until').hidden = !ok
    if (ok) { var ms = new Date(sent[0].expires).getTime(); $('done-until').querySelector('span').textContent = w('left') + ' ' + day(ms) + ' ' + hour(ms) }
    $('done-err').hidden = !errs.length; $('done-err').textContent = errs.join(' · ')
    $('done-acts').hidden = !(ok && link)
    $('done-mailed').hidden = !mailed; $('done-mailed').textContent = mailed ? w('mailed')(mailed) : ''
    $('done-link').textContent = link
    $('done-list').hidden = !ok
    $('done-list').innerHTML = sent.map(function (m) {
      return '<li class="sent"><span class="fi"><svg><use href="#' + icon(m.type) + '"/></svg></span><span class="ft"><b>' + esc(m.name) + '</b><small>' + size(m.size) + '</small></span></li>'
    }).join('')
  }
  function copy(text, btn, word) {
    var label = btn.querySelector('span'), was = label.textContent
    var done = function (good) { label.textContent = good ? word : w('cant'); btn.classList.toggle('ok', good); setTimeout(function () { label.textContent = was; btn.classList.remove('ok') }, 1800) }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { done(true) }, function () { done(false) })
    else done(false)
  }
  $('copy-all').addEventListener('click', function () { if (link) copy(link, $('copy-all'), w('copied')) })
  $('again').addEventListener('click', function () { pcNote(''); files = []; sent = []; errs = []; $('op-to').value = ''; $('op-title').value = ''; $('op-msg').value = ''; $('op-pw').value = ''; show('v-pick'); paint() })

  // ---- the panels (Alex, 21 Oct): My transfers for everyone, Admin for the admin (supabase/transfer-panel.sql) ----
  var mine = null, mineF = 'all'
  var adm = { stats: null, list: null, more: false, who: null, f: 'all', busy: false }
  var ADM_PAGE = 100
  function signedIn() {
    if (graceBack()) return
    var h = (location.hash || '').slice(1)
    tab = 'send'; sendView = busy ? 'v-up' : 'v-pick'
    go(h === 'mine' ? 'mine' : 'send')
    loadPro()
    loadMails()
    sb.rpc('roar_is_admin').then(function (r) {
      isAdmin = r.data === true
      if (!isAdmin) viewAs = ''
      paintAs()
      if (viewAs) isAdmin = false
      try { if (isAdmin) localStorage.setItem('rt-admin', '1') } catch (e) {}
      $('tab-admin').hidden = !isAdmin
      $('op-pc-row').hidden = !isAdmin
      try { $('op-pc').checked = isAdmin && localStorage.getItem('rt-pcloud') === '1' } catch (e) {}
      if (isAdmin && h === 'admin') go('admin')
    })
  }
  function go(t) {
    if (t === 'admin' && !isAdmin) t = 'send'
    tab = t
    try { history.replaceState(null, '', location.pathname + location.search + (t === 'send' ? '' : '#' + t)) } catch (e) {}
    if (t === 'send') { show(sendView); paint() }
    else if (t === 'mine') { show('v-mine'); paintMine(); loadMine() }
    else { show('v-admin'); paintStats(); paintAdmList(); loadAdmin() }
  }
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) go(b.dataset.go) })
  // View as: a fresh start of the page as that user, and back to Admin the same way
  function setAs(v, hash) {
    try { if (v) sessionStorage.setItem('rt-as', v); else sessionStorage.removeItem('rt-as') } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search + hash) } catch (e) {}
    location.reload()
  }
  function paintAs() {
    $('as-bar').hidden = !viewAs
    if (viewAs) $('as-what').textContent = lang === 'el' ? (viewAs === 'pro' ? 'Βλέπεις ως Pro' : 'Βλέπεις ως Free') : (viewAs === 'pro' ? 'Viewing as Pro' : 'Viewing as Free')
  }
  $('v-admin').addEventListener('click', function (e) { var b = e.target.closest('[data-as]'); if (b) setAs(b.dataset.as, '') })
  $('as-back').addEventListener('click', function () { setAs('', '#admin') })

  var loc = function () { return lang === 'el' ? 'el-GR' : 'en-GB' }
  var fmtN = function (n) { return Number(n || 0).toLocaleString(loc()) }
  var sz = function (n) { return Number(n) > 0 ? size(Number(n)) : '0' }
  var when = function (iso) { return new Date(iso).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + hour(new Date(iso).getTime()) }
  var dayD = function (d) { return new Date(d + 'T12:00:00').toLocaleDateString(loc(), { day: 'numeric', month: 'short' }) }
  var dayT = function (d) { return new Date(d).toLocaleDateString(loc(), { day: 'numeric', month: 'short' }) }
  var live = function (m) { return !m.stopped && !m.deleted && new Date(m.expires).getTime() > Date.now() }
  var nameOf = function (u) { return u.display_name || (u.username ? '@' + u.username : u.email || (u.user_id || u.id ? '?' : w('guestN'))) }
  var sum = function (l, k) { return l.reduce(function (n, m) { return n + Number(m[k] || 0) }, 0) }
  function leftText(ms) { var h = ms / 36e5; return h >= 36 ? w('daysLeft')(Math.round(h / 24)) : h >= 1 ? w('hLeft')(Math.round(h)) : w('minLeft')(Math.max(1, Math.round(h * 60))) }
  function where(m) { return m.source === 'link' ? w('byLink') : m.room_kind === 'group' ? (m.room_title || w('group')) : w('dm') }
  function tile(ic, b, s) { return '<span><i><svg><use href="#' + ic + '"/></svg></i><b>' + b + '</b><small>' + s + '</small></span>' }
  function av(u) { return '<span class="av">' + (/^https:\/\//.test(u.avatar_url || '') ? '<img src="' + esc(u.avatar_url) + '" alt="" loading="lazy">' : esc((nameOf(u).replace(/^@/, '')[0] || '?').toUpperCase())) + '</span>' }
  var note = function (t) { return '<li class="ld"><p class="empty">' + t + '</p></li>' }
  var loading = '<li class="ld"><span class="wait" aria-label="Loading"></span></li>'

  // one transfer: name, size, when, where it went, whether its link still works, how often it was downloaded
  function row(m, n, withWho) {
    var on = live(m), left = new Date(m.expires).getTime() - Date.now()
    var st = m.deleted ? '<i>' + w('deleted') + '</i>' : m.stopped ? '<i>' + w('stoppedT') + '</i>'
      : on ? '<i class="' + (left < 864e5 ? 'soon' : 'on') + '">' + w('active') + ' · ' + leftText(left) + '</i>' : '<i>' + w('expired') + '</i>'
    var counts = '<i class="dl">' + w('dls')(Number(m.downloads || 0)) + '</i>' + (Number(m.opens) ? '<i>' + w('opensN')(Number(m.opens)) + '</i>' : '')
    var by = withWho ? '<i class="dl">' + esc(nameOf(m)) + '</i>' + (m.email && m.username ? '<i>' + esc(m.email) + '</i>' : '') : ''
    var acts = ''
    if (on && m.token) acts += '<button type="button" class="cp" data-cp="' + n + '"><svg><use href="#i-link"/></svg><span>' + w('copy') + '</span></button>'
    if (on && m.source === 'link') acts += '<button type="button" class="cp stop" data-stop="' + n + '" title="' + esc(w('stopT')) + '"><svg><use href="#i-trash"/></svg><span>' + w('stop') + '</span></button>'
    // a Pro's own links (Alex, 25 Oct): expiry, password, and who opened and downloaded
    var mineRow = !withWho && isProNow() && m.token && m.source === 'link'
    if (mineRow) acts = '<button type="button" class="cp" data-info="' + n + '"><svg><use href="#i-timer"/></svg><span>' + pw('details') + '</span></button>' + acts
    // while picking (My transfers, Select): a round check instead of the icon, only on links that can be deleted
    if (!withWho && picks) {
      var can = on && m.source === 'link', got = !!picks[n]
      // the same one quiet line as the list (Alex, 10 Nov), a round check in front
      var pbits = [sz(m.size), m.deleted ? w('deleted') : m.stopped ? w('stoppedT') : on ? leftText(left) : w('expired'), w('dls')(Number(m.downloads || 0))]
      return '<li class="tx one pickrow' + (can ? '' : ' nopick') + (got ? ' picked' : '') + (on ? '' : ' off') + '"' + (can ? ' data-pick="' + n + '"' : '') + '><span class="fi pk"><svg><use href="#i-check"/></svg></span>'
        + '<span class="ft"><b title="' + esc(m.name) + '">' + esc(m.name) + '</b><small>' + pbits.map(esc).join(' · ') + '</small></span></li>'
    }
    // My transfers (Alex, 10 Nov): one quiet line; a tap opens the link's window with everything (lmOpen)
    if (!withWho) {
      var bits = [sz(m.size), m.deleted ? w('deleted') : m.stopped ? w('stoppedT') : on ? leftText(left) : w('expired'), w('dls')(Number(m.downloads || 0))]
      return '<li class="tx one' + (on ? '' : ' off') + '" data-lm="' + esc(m.token || '') + '" data-n="' + n + '" tabindex="0" role="button"><span class="fi"><svg><use href="#' + icon(m.type) + '"/></svg></span>'
        + '<span class="ft"><b title="' + esc(m.name) + '">' + esc(m.name) + '</b><small>' + (on && left < 864e5 ? '<em class="soon-dot"></em>' : '') + esc(bits[0]) + ' · ' + esc(bits[1]) + '<span class="dlb"> · ' + esc(bits[2]) + '</span></small></span>'
        + '<svg class="lm-chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></li>'
    }
    return '<li class="tx' + (on ? '' : ' off') + '"><span class="fi"><svg><use href="#' + icon(m.type) + '"/></svg></span>'
      + '<span class="ft"><b title="' + esc(m.name) + '">' + esc(m.name) + '</b><small>' + sz(m.size) + ' · ' + when(m.created_at) + ' · ' + esc(where(m)) + '</small>'
      + '<span class="chips">' + by + st + counts + '</span></span>' + (acts ? '<span class="acts">' + acts + '</span>' : '')
      + (mineRow && det.token === m.token ? detHtml(on) : '') + '</li>'
  }
  function filt(list, f, q) {
    q = (q || '').trim().toLowerCase()
    return list.filter(function (m) {
      if (f === 'on' ? !live(m) : f === 'off' ? live(m) : false) return false
      return !q || [m.name, m.room_title, m.username, m.display_name, m.email].some(function (x) { return (x || '').toLowerCase().indexOf(q) >= 0 })
    })
  }
  function segs(id, set) {
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return
      $(id).querySelectorAll('[data-f]').forEach(function (x) { x.classList.toggle('on', x === b) })
      set(b.dataset.f)
    })
  }
  // Copy link and Stop on a row; Stop ends the link at once, then the file goes (Storage, the person's own folder)
  function rowActs(listId, get, reload) {
    $(listId).addEventListener('click', async function (e) {
      var c = e.target.closest('[data-cp]'), s = e.target.closest('[data-stop]'), inf = e.target.closest('[data-info]')
      if (c) { copy(PAGE + get()[+c.dataset.cp].token, c, w('copied')); return }
      if (inf) { openDet(get()[+inf.dataset.info]); return }
      if (e.target.closest('[data-dsave]')) { saveDet(false); return }
      if (e.target.closest('[data-dpwoff]')) { saveDet(true); return }
      var pl = e.target.closest('[data-dpay]'); if (pl) { savePay(pl.checked); return }
      if (!s) return
      var m = get()[+s.dataset.stop]
      if (!window.confirm(w('stopAsk')(m.name))) return
      s.disabled = true
      try { await stopOne(m) } catch (x) { s.disabled = false; window.alert(x.message); return }
      reload()
    })
  }
  // one link ended and its file gone: R2 through roartransfer-r2, older Storage files through roar_transfer_stop
  async function stopOne(m) {
    if (/^(free|week|pro)\//.test(m.path)) { await bridge({ action: 'delete', key: m.path }); return }
    var r = await sb.rpc('roar_transfer_stop', { p: m.path })
    if (r.error) throw new Error(r.error.message)
    try { await sb.storage.from(BUCKET).remove([m.path]) } catch (x) {}
  }

  // ---- My transfers ----
  // Emails from RoarTransfer (Alex, 3 Nov): "downloaded" and "someone sent you files" can be turned off, both on until
  // then (roar_transfer_mail_prefs, supabase/transfer-mail-prefs.sql in roarme; the Edge Functions skip who turned one off)
  var mails = { downloads: true, received: true }
  function loadMails() {
    if (!user) return
    sb.from('roar_transfer_mail_prefs').select('downloads, received').maybeSingle().then(function (r) {
      if (r.error) return
      mails = r.data || { downloads: true, received: true }
      $('em-dl').checked = mails.downloads; $('em-got').checked = mails.received
      $('op-notify').checked = mails.downloads // a new transfer's own box follows it
      $('mine-mails').hidden = false
    })
  }
  function setMail(k, v) {
    if (!user) return
    var row = { user_id: user.id, downloads: mails.downloads, received: mails.received }
    row[k] = v
    sb.from('roar_transfer_mail_prefs').upsert(row).then(function (r) {
      if (r.error) { $(k === 'downloads' ? 'em-dl' : 'em-got').checked = !v; return }
      mails = { downloads: row.downloads, received: row.received }
      if (k === 'downloads') $('op-notify').checked = v
    })
  }
  $('em-dl').addEventListener('change', function () { setMail('downloads', this.checked) })
  $('em-got').addEventListener('change', function () { setMail('received', this.checked) })
  function loadMine() {
    loadMails()
    sb.rpc('roar_my_transfers').then(function (r) {
      if (r.error) { $('mine-err').textContent = r.error.message; $('mine-err').hidden = false; return }
      $('mine-err').hidden = true; mine = r.data || []; paintMine(); if (lmN >= 0) lmPaint()
    })
    loadPro()
  }
  function paintMine() {
    $('mine-q').placeholder = w('find')
    if (!mine) { $('mine-facts').textContent = ''; $('mine-list').innerHTML = loading; return }
    // the totals in one quiet line (Alex, 10 Nov: "too many lines"; four big tiles until then)
    var act = mine.filter(live)
    $('mine-facts').textContent = mine.length ? [w('nTransfers')(mine.length), sz(sum(mine, 'size')), fmtN(act.length) + ' ' + w('tActive'), w('dls')(sum(mine, 'downloads'))].join(' · ') : ''
    var shown = filt(mine.filter(function (m) { return !m.stopped }), mineF, $('mine-q').value)
    $('mine-list').innerHTML = shown.length ? shown.map(function (m) { return row(m, mine.indexOf(m), false) }).join('') : note(mine.length ? w('noneFound') : w('noneYet'))
    paintPick(shown)
  }
  // ---- Select (Alex, 2 Nov: "select, to delete many links at once") ----
  var picks = null
  function pickable(shown) { return (shown || []).filter(function (m) { return live(m) && m.source === 'link' }).map(function (m) { return mine.indexOf(m) }) }
  function paintPick(shown) {
    $('mine-sel').querySelector('span').textContent = w('sel')
    $('mine-sel').hidden = !!picks || !pickable(shown).length
    $('mine-selbar').hidden = !picks
    if (!picks) return
    var n = Object.keys(picks).length, all = pickable(shown)
    $('mine-seln').textContent = w('selN')(n)
    $('mine-selall').textContent = n && n === all.length ? w('selNone') : w('selAll')
    $('mine-selx').textContent = w('selX')
    $('mine-seldel').querySelector('span').textContent = w('selDel') + (n ? ' (' + n + ')' : '')
    $('mine-seldel').disabled = !n
  }
  function shownMine() { return filt(mine.filter(function (m) { return !m.stopped }), mineF, $('mine-q').value) }
  $('mine-sel').addEventListener('click', function () { picks = {}; paintMine() })
  $('mine-selx').addEventListener('click', function () { picks = null; paintMine() })
  $('mine-selall').addEventListener('click', function () {
    var all = pickable(shownMine())
    if (Object.keys(picks).length === all.length) picks = {}; else { picks = {}; all.forEach(function (i) { picks[i] = 1 }) }
    paintMine()
  })
  $('mine-list').addEventListener('click', function (e) {
    if (!picks) return
    var li = e.target.closest('[data-pick]'); if (!li) return
    e.stopImmediatePropagation()
    var i = +li.dataset.pick
    if (picks[i]) delete picks[i]; else picks[i] = 1
    li.classList.toggle('picked', !!picks[i]); paintPick(shownMine())
  }, true)
  $('mine-seldel').addEventListener('click', async function () {
    var list = Object.keys(picks || {}).map(function (i) { return mine[+i] }).filter(Boolean)
    if (!list.length || !window.confirm(w('selAsk')(list.length))) return
    var b = $('mine-seldel'), bad = []
    b.disabled = true; $('mine-selx').disabled = true; $('mine-selall').disabled = true
    for (var k = 0; k < list.length; k++) {
      b.querySelector('span').textContent = w('selDel') + ' ' + (k + 1) + '/' + list.length
      try { await stopOne(list[k]) } catch (x) { bad.push(list[k].name + ': ' + x.message) }
    }
    $('mine-selx').disabled = false; $('mine-selall').disabled = false
    picks = null
    if (bad.length) window.alert(bad.join('\n'))
    loadMine()
  })
  segs('mine-seg', function (f) { mineF = f; paintMine() })
  $('mine-q').addEventListener('input', paintMine)
  rowActs('mine-list', function () { return mine }, loadMine)

  // ---- Admin ----
  var KC = { video: '#ff5a4e', image: '#ffb35c', audio: '#7cc4ff', other: '#a0a7b3' }
  function admErr(m) { $('adm-err').textContent = m; $('adm-err').hidden = false }
  function loadAdmin() {
    if (!isAdmin) return
    $('adm-err').hidden = true
    sb.rpc('roar_admin_transfer_stats', { days: Number(adm.days || 0) }).then(function (r) { if (r.error) admErr(r.error.message); else { adm.stats = r.data; paintStats() } })
    adm.usage = null; paintStore()
    bridge({ action: 'usage' }).then(function (d) { adm.usage = d; paintStore(); paintStats() }).catch(function (e) { adm.usage = { error: e.message }; paintStore() })
    sb.rpc('roar_admin_transfer_accounts').then(function (r) { if (r.error) admErr(r.error.message); else { adm.acc = r.data || []; paintAcc() } })
    loadAdmPro(); paintAdmBg()
    loadAdmList(false)
  }
  function loadAdmList(next) {
    if (adm.busy) return
    adm.busy = true; $('adm-more').disabled = true
    var before = next && adm.list && adm.list.length ? adm.list[adm.list.length - 1].created_at : null
    sb.rpc('roar_admin_transfers', { before: before, lim: ADM_PAGE, who: adm.who ? adm.who.id : null }).then(function (r) {
      adm.busy = false; $('adm-more').disabled = false
      if (r.error) { admErr(r.error.message); return }
      var d = r.data || []
      adm.list = next ? adm.list.concat(d) : d; adm.more = d.length === ADM_PAGE; paintAdmList()
    })
  }
  function paintStats() {
    var s = adm.stats
    if (!s) { $('adm-facts').innerHTML = ''; $('adm-chart').innerHTML = ''; $('adm-kinds').innerHTML = ''; $('adm-top').innerHTML = loading; return }
    $('adm-facts').innerHTML = tile('i-up', fmtN(s.transfers), w('tTransfers') + ' · ' + w('chatLink')(fmtN(s.from_chat), fmtN(s.from_link)))
      + tile('i-file', sz(s.bytes), w('tSent')) + tile('i-user', fmtN(s.senders), w('tSenders'))
      + tile('i-down', fmtN(s.downloads), w('tDownloads') + ' · ' + w('opensN')(Number(s.opens)))
      + tile('i-timer', fmtN(s.active), w('tActive') + ' · ' + sz(s.active_bytes)) + tile('i-box', adm.usage && !adm.usage.error ? sz(adm.usage.bytes) : '…', w('tStored')(adm.usage && !adm.usage.error ? Number(adm.usage.files) : 0))
      + tile('i-cal', fmtN(s.week), w('tWeek') + ' · ' + sz(s.week_bytes)) + tile('i-file', sz(s.biggest), w('tBiggest'))
    var days = s.days || [], max = Math.max.apply(null, days.map(function (d) { return Number(d.bytes) }).concat([1]))
    $('adm-chart').innerHTML = '<div class="cols" style="grid-template-columns:repeat(' + Math.max(1, days.length) + ',minmax(0,1fr))">' + days.map(function (d) {
      var b = Number(d.bytes)
      return '<i' + (b ? '' : ' class="z"') + ' style="height:' + (b ? Math.max(4, b / max * 100) : 2) + '%" title="' + esc(dayD(d.day) + ': ' + w('nTransfers')(Number(d.n)) + ' · ' + sz(b)) + '"></i>'
    }).join('') + '</div>' + (days.length ? '<div class="ax"><span>' + dayD(days[0].day) + '</span><span>' + dayD(days[days.length - 1].day) + '</span></div>' : '')
    var kinds = (s.kinds || []).slice().sort(function (a, b) { return b.bytes - a.bytes }), kb = sum(kinds, 'bytes')
    $('adm-kinds').innerHTML = kinds.length
      ? '<div class="bar">' + kinds.map(function (k) { return '<i style="width:' + (kb ? k.bytes / kb * 100 : 100 / kinds.length) + '%;background:' + KC[k.kind] + '"></i>' }).join('') + '</div>'
        + '<div class="lg">' + kinds.map(function (k) { return '<span style="--c:' + KC[k.kind] + '">' + w('k_' + k.kind) + ' <b>' + fmtN(k.n) + '</b> · ' + sz(k.bytes) + '</span>' }).join('') + '</div>'
      : '<p class="empty">' + w('noneAll') + '</p>'
    var top = s.top || []
    $('adm-top').innerHTML = top.length ? top.map(function (u, n) {
      return '<li data-who="' + n + '"><span class="rank">' + (n + 1) + '</span>' + av(u) + '<span class="ft"><b>' + esc(nameOf(u)) + '</b><small>' + esc(u.email || '') + '</small>'
        + '<span class="chips"><i class="dl">' + sz(u.bytes) + '</i><i>' + w('nTransfers')(Number(u.n)) + '</i><i>' + w('dls')(Number(u.downloads)) + '</i></span></span></li>'
    }).join('') : note(w('noneAll'))
  }
  function paintStore() {
    var u = adm.usage, el = $('adm-store')
    if (!u) { el.innerHTML = loading; return }
    if (u.error) { el.innerHTML = note(esc(u.error)); return }
    var inc = 1e10, used = Number(u.bytes), pct = Math.min(100, used / inc * 100), over = used > inc
    var GBd = function (n) { return (n / 1e9).toFixed(2) + ' GB' }
    var cost = over ? (Math.ceil((used - inc) / 1e9 * 100) / 100 * 0.015).toFixed(2) : '0.00'
    el.innerHTML = '<div class="meter' + (over ? ' over' : pct > 80 ? ' warn' : '') + '"><span class="bar"><i style="width:' + pct.toFixed(1) + '%"></i></span>'
      + '<small><b>' + GBd(used) + '</b> ' + w('stOf') + ' · ' + (over ? w('stOver')(GBd(used - inc)) : w('stLeft')(GBd(inc - used))) + ' · ' + w('stFiles')(Number(u.files)) + '</small></div>'
      + '<div class="chips"><i>' + w('stAcc') + ' ' + sz(u.free) + '</i><i>FastTransfer ' + sz(u.guest) + '</i><i>Pro ' + sz(u.pro) + '</i>' + (Number(u.other) ? '<i>' + w('stOther') + ' ' + sz(u.other) + '</i>' : '') + (Number(u.open) ? '<i class="bad">' + w('stOpen')(Number(u.open)) + '</i>' : '') + '</div>'
      + '<p class="hint">' + w('stHint')(cost) + '</p>'
  }
  function paintAcc() {
    var a = adm.acc
    if (!a) { $('adm-acc').innerHTML = loading; $('adm-acc-n').textContent = ''; $('adm-acc-sum').textContent = ''; return }
    var week = Date.now() - 7 * 864e5
    $('adm-acc-n').textContent = fmtN(a.length); $('tc-acc').textContent = fmtN(a.length)
    $('adm-acc-sum').textContent = w('accSum')(a.filter(function (u) { return new Date(u.created_at).getTime() > week }).length, a.filter(function (u) { return Number(u.n) > 0 }).length, a.filter(function (u) { return !u.confirmed }).length)
    $('adm-acc').innerHTML = a.length ? a.map(function (u, n) {
      var isPro = proIds()[u.id]
      // tidier than a row of chips (Alex, 2 Nov): the name with its tags, the numbers bold in one line, the dates quiet below
      var num = function (t) { var i = t.indexOf(' '); return '<span><b>' + esc(t.slice(0, i)) + '</b> ' + esc(t.slice(i + 1)) + '</span>' }
      var nums = [num(w('nTransfers')(Number(u.n)))].concat(Number(u.n) ? [num(sz(u.bytes)), num(w('dls')(Number(u.downloads)))] : [])
      var dates = [w('joined') + ' ' + dayT(u.created_at)].concat(Number(u.n) ? [w('lastSent') + ' ' + dayT(u.last)] : [], u.last_sign_in_at ? [w('lastIn') + ' ' + dayT(u.last_sign_in_at)] : [])
      return '<li data-acc="' + n + '">' + av(u) + '<span class="ft"><b class="acc-n">' + esc(nameOf(u)) + (isPro ? ' <i class="tag pro">PRO</i>' : '') + (u.confirmed ? '' : ' <i class="tag bad">' + w('unconfC') + '</i>') + '</b><small>' + esc(u.email || '') + '</small>'
        + '<span class="acc-nums">' + nums.join('') + '</span><span class="acc-dates">' + esc(dates.join(' · ')) + '</span></span>'
        + (isPro || !admPro.list ? '' : '<span class="acc-pro"><button type="button" class="pill sm" data-trial="' + esc(u.id) + '"><span>' + pw('trial') + '</span></button><button type="button" class="pill sm" data-mkpro="' + esc(u.id) + '"><span>' + pw('make') + '</span></button></span>') + '</li>'
    }).join('') : note(w('noAcc'))
  }
  // a tap on an account shows only its transfers below
  $('adm-acc').addEventListener('click', function (e) {
    // Pro Trial (Alex, 2 Nov): an account row gives Pro for three months at one press
    var mk = e.target.closest('[data-trial]')
    if (mk) { grantPro({ id: mk.dataset.trial }, mk, 3); return }
    var mp = e.target.closest('[data-mkpro]')
    if (mp) { grantPro({ id: mp.dataset.mkpro }, mp); return }
    var li = e.target.closest('[data-acc]'); if (!li || !adm.acc) return
    adm.who = adm.acc[+li.dataset.acc]; adm.list = null; paintAdmList(); loadAdmList(false)
    // to the Transfers tab, showing only theirs
    var tb = $('adm-tab').querySelector('[data-f="all"]'); if (tb) tb.click()
  })
  function paintAdmList() {
    $('adm-q').placeholder = w('findAdm')
    $('adm-who').hidden = !adm.who
    if (adm.who) $('adm-who').querySelector('span').textContent = w('only') + ' ' + nameOf(adm.who)
    $('adm-who-x').setAttribute('aria-label', w('everyone'))
    if (!adm.list) { $('adm-list').innerHTML = loading; $('adm-more').hidden = true; return }
    var shown = filt(adm.list, adm.f, $('adm-q').value)
    $('adm-list').innerHTML = shown.length ? shown.map(function (m) { return row(m, adm.list.indexOf(m), true) }).join('') : note(adm.list.length ? w('noneFound') : w('noneAll'))
    $('adm-more').hidden = !adm.more
  }
  // a tap on someone in "Who sends the most" shows only their transfers; the x shows everyone's again
  $('adm-top').addEventListener('click', function (e) {
    var li = e.target.closest('[data-who]'); if (!li || !adm.stats) return
    adm.who = adm.stats.top[+li.dataset.who]; adm.list = null; paintAdmList(); loadAdmList(false)
    // to the Transfers tab, showing only theirs
    var tb = $('adm-tab').querySelector('[data-f="all"]'); if (tb) tb.click()
  })
  $('adm-who-x').addEventListener('click', function () { adm.who = null; adm.list = null; paintAdmList(); loadAdmList(false) })
  segs('adm-seg', function (f) { adm.f = f; paintAdmList() })
  $('adm-q').addEventListener('input', paintAdmList)
  $('adm-more').addEventListener('click', function () { loadAdmList(true) })
  rowActs('adm-list', function () { return adm.list }, loadAdmin)


  // My transfers in two for a Pro (Alex, 26 Oct; the Pro tab moved to Settings on 10 Nov): Sent, Received
  var MINE = { sent: 'mpane-sent', got: 'mpane-got' }, mineT = { tab: 'sent' }
  panes('mine-tab', MINE, mineT, function () {})

  // ---- a Pro's own link: details (Alex, 25 Oct: change expiry or password after sending; who opened, when, from where) ----
  var det = { token: '', data: null, busy: false, msg: '' }
  var country = function (c) { try { return c ? new Intl.DisplayNames([lang], { type: 'region' }).of(c) : '' } catch (e) { return c || '' } }
  var localIso = function (d) { var x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16) }
  function detHtml(on) {
    var d = det.data
    if (!d) return '<div class="det"><span class="wait" aria-label="Loading"></span></div>'
    var ev = d.events.length ? d.events.map(function (x) {
      return '<li><b>' + (x.kind === 'download' ? pw('evDl') : pw('evOpen')) + '</b><span>' + when(x.at) + (x.country ? ' · ' + esc(country(x.country)) : '') + (x.device ? ' · ' + esc(x.device) : '') + '</span></li>'
    }).join('') : '<li><span>' + pw('noEv') + '</span></li>'
    return '<div class="det">'
      + (on ? '<div class="row2"><label class="pro-lbl" style="margin:0">' + pw('expT') + '</label><input class="in" type="datetime-local" id="det-until" value="' + localIso(d.expires) + '" max="' + localIso(d.max) + '"><small class="pro-lbl" style="margin:0">' + pw('maxT')(dayY(d.max)) + '</small></div>'
        + (d.bundle ? '<div class="row2"><input class="in" type="password" id="det-pw" autocomplete="new-password" maxlength="100" placeholder="' + esc(pw('pwNew')) + '">'
          + (d.locked ? '<button type="button" class="pill sm" data-dpwoff><span>' + pw('pwOff') + '</span></button>' : '') + '</div>' : '')
        // awaiting payment (Alex, 10 Nov 2026): on or off at once, the same link
        + (d.payLock != null ? '<div class="row2"><label class="chk"><input type="checkbox" data-dpay' + (d.payLock ? ' checked' : '') + (det.busy ? ' disabled' : '') + '><span>' + pw('payT') + '</span></label>' + (d.payLock ? '<span class="chips"><i class="soon">' + pw('payOn') + '</i></span>' : '') + '</div>' : '')
        + '<div class="row2"><button type="button" class="pill main sm" data-dsave' + (det.busy ? ' disabled' : '') + '><span>' + pw('saveC') + '</span></button>'
        + (d.locked ? '<span class="chips"><i>' + pw('locked') + '</i></span>' : '') + (det.msg ? '<span class="ok">' + esc(det.msg) + '</span>' : '') + '</div>' : '')
      + '<ul class="ev">' + ev + '</ul></div>'
  }
  function openDet(m) {
    if (det.token === m.token) { det.token = ''; det.data = null; paintMine(); return }
    det = { token: m.token, data: null, busy: false, msg: '' }; paintMine()
    proCall({ action: 'link', token: m.token }).then(function (d) { if (det.token === m.token) { det.data = d; paintMine() } })
      .catch(function (e) { det.token = ''; window.alert(e.message); paintMine() })
  }
  function saveDet(pwOff) {
    if (!det.data || det.busy) return
    var body = { action: 'edit', token: det.token }
    var u = $('det-until') && $('det-until').value, p = $('det-pw') && $('det-pw').value
    if (u && localIso(det.data.expires) !== u) body.until = new Date(u).toISOString()
    if (pwOff) body.password = ''; else if (p) body.password = p
    if (!body.until && body.password == null) return
    det.busy = true; paintMine(); lmPaint()
    proCall(body).then(function (r) {
      det.busy = false; det.msg = pw('bSaved')
      if (r.until) det.data.expires = r.until
      if (r.locked != null) det.data.locked = r.locked
      loadMine()
    }).catch(function (e) { det.busy = false; paintMine(); lmPaint(); window.alert(e.message) })
  }

  // Locked until paid (Alex, 10 Nov 2026): roartransfer-pro 'edit' sets it on the upload's link and every file of it
  function savePay(on) {
    if (!det.data || det.busy) return
    det.busy = true; det.msg = ''; paintMine(); lmPaint()
    proCall({ action: 'edit', token: det.token, payLock: on }).then(function (r) {
      det.busy = false; det.msg = pw('bSaved')
      if (r.payLock != null) det.data.payLock = r.payLock
      paintMine(); lmPaint()
    }).catch(function (e) { det.busy = false; paintMine(); lmPaint(); window.alert(e.message) })
  }

  // ---- the link's window (Alex, 10 Nov): what it is, Copy / Open, its details for a Pro, Delete apart in red ----
  var lmN = -1
  function lmM() { return mine && lmN >= 0 ? mine[lmN] : null }
  function lmOpen(n) {
    lmN = n; var m = lmM(); if (!m) return
    det = { token: '', data: null, busy: false, msg: '' }
    if (isProNow() && m.token && m.source === 'link') {
      det.token = m.token
      proCall({ action: 'link', token: m.token }).then(function (d) { if (det.token === m.token) { det.data = d; lmPaint() } }).catch(function (e) { det.token = ''; lmPaint(); window.alert(e.message) })
    }
    $('lm').hidden = false; document.documentElement.classList.add('lm-on'); lmPaint()
  }
  function lmClose() { lmAct = false; lmN = -1; det = { token: '', data: null, busy: false, msg: '' }; $('lm').hidden = true; document.documentElement.classList.remove('lm-on') }
  function lmPaint() {
    var m = lmM(); if (!m) { if (!$('lm').hidden) lmClose(); return }
    var on = live(m), left = new Date(m.expires).getTime() - Date.now()
    var st = m.deleted ? w('deleted') : m.stopped ? w('stoppedT') : on ? w('active') + ' · ' + leftText(left) : w('expired')
    var facts = [sz(m.size), when(m.created_at), where(m)].map(esc).join(' · ')
    var counts = w('dls')(Number(m.downloads || 0)) + (Number(m.opens) ? ' · ' + w('opensN')(Number(m.opens)) : '')
    var html = '<div class="lm-h"><span class="fi"><svg><use href="#' + icon(m.type) + '"/></svg></span><span class="ft"><b id="lm-name">' + esc(m.name) + '</b><small>' + facts + '</small></span>'
      + '<button type="button" class="lm-x" data-lmx aria-label="Close"><svg><use href="#i-x"/></svg></button></div>'
      + '<p class="lm-st"><i class="' + (on ? (left < 864e5 ? 'soon' : 'on') : 'off') + '"></i>' + esc(st) + ' · ' + esc(counts) + '</p>'
    if (on && m.token) html += '<div class="lm-acts"><button type="button" class="pill main" data-lmcp><svg><use href="#i-link"/></svg><span>' + w('copy') + '</span></button>'
      + '<a class="pill" href="' + esc(PAGE + m.token) + '" target="_blank" rel="noopener"><svg><use href="#i-eye"/></svg><span>' + w('lmOpen') + '</span></a></div>'
    if (det.token === m.token) html += lmDet(on)
    if (on && m.source === 'link') html += '<button type="button" class="lm-del" data-lmdel><svg><use href="#i-trash"/></svg><span>' + w('stop') + '</span></button>'
    $('lm-card').innerHTML = html
  }
  // a Pro's settings for the link, in plain rows (Alex, 10 Nov: "too many lines, all mixed up; the opens folded, buttons centred")
  var lmAct = false
  function lmDet(on) {
    var d = det.data
    if (!d) return '<div class="lm-load"><span class="wait" aria-label="Loading"></span></div>'
    var h = ''
    if (on) {
      h += '<div class="lm-set">'
        + '<label class="lm-row"><span class="k">' + pw('expT') + '<small>' + esc(pw('maxT')(dayY(d.max))) + '</small></span><input class="in" type="datetime-local" id="det-until" value="' + localIso(d.expires) + '" max="' + localIso(d.max) + '"></label>'
        + (d.bundle ? '<label class="lm-row"><span class="k">' + pw('pwT') + '<small>' + (d.locked ? pw('pwHas') : pw('pwNo')) + '</small></span><input class="in" type="password" id="det-pw" autocomplete="new-password" maxlength="100" placeholder="' + esc(d.locked ? pw('pwChange') : pw('pwSet')) + '"></label>' : '')
        + (d.payLock != null ? '<label class="lm-row sw-row"><span class="k">' + pw('payT') + '<small>' + (d.payLock ? pw('payOn') : pw('payOff')) + '</small></span><span class="sw' + (d.payLock ? ' on' : '') + '"><input type="checkbox" data-dpay' + (d.payLock ? ' checked' : '') + (det.busy ? ' disabled' : '') + '><i></i></span></label>' : '')
        + '</div>'
        + '<div class="lm-save" id="lm-save" hidden><button type="button" class="pill main" data-dsave' + (det.busy ? ' disabled' : '') + '><span>' + pw('saveC') + '</span></button></div>'
        + (d.bundle && d.locked ? '<div class="sm-acts"><button type="button" class="pill sm" data-dpwoff><span>' + pw('pwOff') + '</span></button></div>' : '')
        + (det.msg ? '<p class="lm-ok">' + esc(det.msg) + '</p>' : '')
    }
    var n = d.events.length
    h += '<button type="button" class="lm-fold' + (lmAct ? ' open' : '') + '" data-lmact' + (n ? '' : ' disabled') + '><span>' + pw('actT') + ' <em>' + (n ? n : pw('noEv')) + '</em></span><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    if (n && lmAct) h += '<ul class="lm-ev">' + d.events.map(function (x) {
      return '<li><b>' + (x.kind === 'download' ? pw('evDl') : pw('evOpen')) + '</b><span>' + when(x.at) + (x.country ? ' · ' + esc(country(x.country)) : '') + (x.device ? ' · ' + esc(x.device) : '') + '</span></li>'
    }).join('') + '</ul>'
    return h
  }
  // Save shows only once something was changed
  $('lm').addEventListener('input', function (e) { if (e.target.id === 'det-until' || e.target.id === 'det-pw') { var b = $('lm-save'); if (b) b.hidden = false } })
  $('lm').addEventListener('click', async function (e) {
    if (e.target.closest('[data-lmact]')) { lmAct = !lmAct; lmPaint(); return }
    if (e.target.closest('[data-lmx]')) { lmClose(); return }
    var m = lmM(); if (!m) return
    var c = e.target.closest('[data-lmcp]'); if (c) { copy(PAGE + m.token, c, w('copied')); return }
    if (e.target.closest('[data-dsave]')) { saveDet(false); return }
    if (e.target.closest('[data-dpwoff]')) { saveDet(true); return }
    var pl = e.target.closest('[data-dpay]'); if (pl) { savePay(pl.checked); return }
    var d = e.target.closest('[data-lmdel]'); if (!d) return
    if (!window.confirm(w('stopAsk')(m.name))) return
    d.disabled = true
    try { await stopOne(m) } catch (x) { d.disabled = false; window.alert(x.message); return }
    lmClose(); loadMine()
  })
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('lm').hidden) lmClose() })
  $('mine-list').addEventListener('click', function (e) {
    if (picks) return
    var li = e.target.closest('li[data-lm]'); if (li) lmOpen(+li.dataset.n)
  })
  $('mine-list').addEventListener('keydown', function (e) {
    if (picks || (e.key !== 'Enter' && e.key !== ' ')) return
    var li = e.target.closest('li[data-lm]'); if (li) { e.preventDefault(); lmOpen(+li.dataset.n) }
  })

  // ---- a Pro's brand (Alex, 25 Oct): name, logo and backgrounds, pictures in roartransfer-brand/<their id>/ ----
  var BRAND_BUCKET = 'roartransfer-brand'
  var brandEd = null, brandSlot = ''
  function paintBrand() {
    // filled once the account's brand has come (roartransfer-pro 'me'); until then nothing can be changed
    if (!brandEd && proMe) brandEd = { name: (proMe.brand || {}).name || '', logo: (proMe.brand || {}).logo || '', bgs: ((proMe.brand || {}).bgs || []).slice(), busy: false }
    if (!brandEd) { $('pb-logo').innerHTML = $('pb-bgs').innerHTML = loading.replace(/li/g, 'span'); $('pb-save').disabled = true; return }
    $('pb-name').placeholder = pw('bName'); if (document.activeElement !== $('pb-name')) $('pb-name').value = brandEd.name
    $('pb-lt').textContent = pw('bLogo'); $('pb-bt').textContent = pw('bBgs')
    var add = function (slot, n) { return n ? '' : '<button type="button" class="add" data-badd="' + slot + '"' + (brandEd.busy ? ' disabled' : '') + '><svg><use href="#i-up"/></svg>' + pw('bAdd') + '</button>' }
    $('pb-logo').innerHTML = brandEd.logo ? '<div class="tile logo"><img src="' + esc(brandEd.logo) + '" alt=""><button type="button" class="x" data-brm="logo" aria-label="Remove"><svg><use href="#i-x"/></svg></button></div>' : add('logo', 0)
    $('pb-bgs').innerHTML = brandEd.bgs.map(function (u, n) { return '<div class="tile"><img src="' + esc(u) + '" alt="" loading="lazy"><button type="button" class="x" data-brm="' + n + '" aria-label="Remove"><svg><use href="#i-x"/></svg></button></div>' }).join('')
      + add('bg', brandEd.bgs.length >= 8)
    $('pb-save').querySelector('span').textContent = pw('save'); $('pb-save').disabled = brandEd.busy
    var bs = [brandEd.name, brandEd.logo ? pw('bLogo') : '', brandEd.bgs.length ? brandEd.bgs.length + ' ' + pw('bBgN') : ''].filter(Boolean)
    $('set-brand-n').textContent = bs.length ? bs.join(' · ') : pw('bNone')
  }
  // a picture made light enough to fill a page (Alex, 25 Oct: "up to 10 MB, then compressed a little without losing
  // much quality"): at most 2560 px on its long side as WebP at 0.86 (JPEG where the browser cannot write WebP);
  // a logo at most 1000 px and keeps its transparency. SVG and GIF go up as they are.
  function shrink(file, logo) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.resolve(file)
    return new Promise(function (ok) {
      var u = URL.createObjectURL(file), im = new Image()
      im.onload = function () {
        var max = logo ? 1000 : 2560, w0 = im.naturalWidth, h0 = im.naturalHeight, k = Math.min(1, max / Math.max(w0, h0))
        var c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k)
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
        URL.revokeObjectURL(u)
        c.toBlob(function (b) {
          var done = function (x) { ok(x && x.size < file.size ? x : k < 1 && x ? x : file) }
          if (b && b.type === 'image/webp') return done(b)
          // no WebP writer (older Safari): JPEG for a background, PNG for a logo so it keeps its transparency
          c.toBlob(done, logo ? 'image/png' : 'image/jpeg', 0.86)
        }, 'image/webp', 0.86)
      }
      im.onerror = function () { URL.revokeObjectURL(u); ok(file) }
      im.src = u
    })
  }
  async function upPic(file, folder, logo) {
    if (file.size > 10 * 1024 * 1024) throw new Error(pw('bBig'))
    // pictures only, never SVG (it can carry code; security check, Alex 26 Oct)
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type || '')) throw new Error(lang === 'el' ? 'Βάλε εικόνα JPG, PNG, WebP ή GIF.' : 'Use a JPG, PNG, WebP or GIF picture.')
    file = await shrink(file, logo)
    var ext = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }[file.type] || 'jpg'
    var path = folder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext
    var r = await sb.storage.from(BRAND_BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
    if (r.error) throw new Error(r.error.message)
    return sb.storage.from(BRAND_BUCKET).getPublicUrl(path).data.publicUrl
  }
  $('pb-logo').addEventListener('click', brandClick); $('pb-bgs').addEventListener('click', brandClick)
  function brandClick(e) {
    var a = e.target.closest('[data-badd]'), x = e.target.closest('[data-brm]')
    if (a) { brandSlot = a.dataset.badd; $('pb-file').click() }
    if (x) { if (x.dataset.brm === 'logo') brandEd.logo = ''; else brandEd.bgs.splice(+x.dataset.brm, 1); paintBrand() }
  }
  $('pb-file').addEventListener('change', async function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = ''
    if (!f || !user) return
    $('pb-err').hidden = true; brandEd.busy = true; paintBrand()
    try { var u = await upPic(f, user.id, brandSlot === 'logo'); if (brandSlot === 'logo') brandEd.logo = u; else brandEd.bgs.push(u) } catch (x) { $('pb-err').textContent = x.message; $('pb-err').hidden = false }
    brandEd.busy = false; paintBrand()
  })
  $('pb-name').addEventListener('input', function () { brandEd.name = $('pb-name').value; $('pb-ok').hidden = true })
  $('pb-save').addEventListener('click', function () {
    $('pb-err').hidden = true; $('pb-ok').hidden = true; brandEd.busy = true; paintBrand()
    proCall({ action: 'brand', name: brandEd.name, logo: brandEd.logo, bgs: brandEd.bgs }).then(function (d) {
      brandEd.busy = false; if (proMe) proMe.brand = d.brand; paintBrand(); $('pb-ok').textContent = pw('bSaved'); $('pb-ok').hidden = false
    }).catch(function (x) { brandEd.busy = false; paintBrand(); $('pb-err').textContent = x.message; $('pb-err').hidden = false })
  })

  // ---- the glass that slides to the chosen tab or option (as in RoarMe's Lens), on every row of choices ----
  function lens(el) {
    el.classList.add('lens')
    var put = function () {
      // classes change only when they must: touching them otherwise wakes this observer again, without end
      var on = el.querySelector(':scope > .on')
      if (!on || !on.offsetWidth) { if (el.classList.contains('lens-on')) el.classList.remove('lens-on'); return }
      el.style.setProperty('--lx', on.offsetLeft + 'px'); el.style.setProperty('--ly', on.offsetTop + 'px')
      el.style.setProperty('--lw', on.offsetWidth + 'px'); el.style.setProperty('--lh', on.offsetHeight + 'px')
      if (!el.classList.contains('lens-on')) el.classList.add('lens-on')
      // it slides only once it has a place: the first time it simply appears there
      if (!el.classList.contains('lens-go')) requestAnimationFrame(function () { el.classList.add('lens-go') })
    }
    new MutationObserver(function (l) { if (l.some(function (m) { return m.target !== el })) put() }).observe(el, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] })
    try { var ro = new ResizeObserver(put); ro.observe(el); [].forEach.call(el.children, function (c) { ro.observe(c) }) } catch (e) {}
    put()
  }
  document.querySelectorAll('.seg, .tabs, .lang').forEach(lens)

  // ---- the backgrounds (Alex, 20 Oct: his own pictures; since 25 Oct chosen in Admin > Backgrounds) ----
  // a link's or a Receive-files page waits to know whose it is, so a Pro's own backgrounds show from the start
  var siteBgs = null, bgSet = false, bgWait = getting || dropping
  function setBg(u) {
    if (!u) return
    bgSet = true
    var im = $('bg-img')
    if (im.getAttribute('src') === u) return
    // the new picture fades in over the old one instead of the page going dark between them
    var was = im.getAttribute('src')
    if (was) { var old = im.cloneNode(); old.removeAttribute('id'); old.style.cssText = 'position:absolute;inset:0;opacity:1;transform:none'; $('bg').insertBefore(old, im); setTimeout(function () { old.remove() }, 1200) }
    $('bg').classList.remove('on')
    im.onload = function () { requestAnimationFrame(function () { $('bg').classList.add('on') }) }
    im.src = u
  }
  var pick = function (l) { return l && l.length ? l[Math.floor(Math.random() * l.length)] : '' }
  // one picture for the whole visit (Alex, 25 Oct: a new one on every page made each change of page jolt), and the
  // list kept from last time so the picture is there at once instead of after the list has come
  // (Alex, 25 Oct, later: "it got stuck on one background"): the same picture only when coming from another page of
  // the site; a new visit or a reload picks again, never the one shown last
  var held = '', last = ''
  try {
    last = sessionStorage.getItem('rt-bg') || ''
    var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {}
    var fromSite = /^https?:\/\/(www\.)?roartransfer\.com\//.test(document.referrer || '') && nav.type !== 'reload'
    if (fromSite) held = last
  } catch (e) {}
  function siteBg() {
    var l = siteBgs && siteBgs.length ? siteBgs.map(function (b) { return b.url }) : STILLS.map(function (x) { return 'stills/' + x.f })
    if (held && l.indexOf(held) >= 0) return held
    var other = l.filter(function (u) { return u !== last })
    held = pick(other.length ? other : l)
    try { sessionStorage.setItem('rt-bg', held) } catch (e) {}
    return held
  }
  try { var kept = JSON.parse(localStorage.getItem('rt-bgs') || 'null'); if (Array.isArray(kept) && kept.length) siteBgs = kept } catch (e) {}
  function useBrand(brand, where) {
    var b = brand || null
    $(where + '-brand').hidden = !b || !(b.logo || b.name)
    if (b) {
      $(where + '-logo').hidden = !b.logo; if (b.logo) $(where + '-logo').src = b.logo
      $(where + '-bname').textContent = b.logo ? '' : b.name
      if (b.logo && b.name) $(where + '-logo').alt = b.name
    }
    if (bgWait) { bgWait = false; setBg(b && b.bgs && b.bgs.length ? pick(b.bgs) : siteBg()) }
  }
  function loadSiteBgs() {
    return fetch(URL_ + '/rest/v1/roar_transfer_backgrounds?select=id,url,sort&order=sort.asc,created_at.asc', { headers: { apikey: KEY } })
      .then(function (r) { return r.ok ? r.json() : [] }).catch(function () { return [] })
      .then(function (l) {
        siteBgs = Array.isArray(l) ? l : []
        try { localStorage.setItem('rt-bgs', JSON.stringify(siteBgs)) } catch (e) {}
        if (!bgWait && !bgSet) setBg(siteBg()); paintAdmBg()
      })
  }
  // the remembered list shows its picture at once; never a blank page: after a second and a half the site's own pick
  if (!bgWait && siteBgs && siteBgs.length) setBg(siteBg())
  setTimeout(function () { if (!bgSet) { bgWait = false; setBg(siteBg()) } }, 1500)

  // Admin > Backgrounds
  var bgBusy = false, bgSlim = false
  // pictures put in before they were made light (heavier than 1.5 MB): made light once, in place, when Admin opens
  async function slimBgs() {
    if (bgSlim || !isAdmin || !siteBgs) return
    bgSlim = true
    var heavy = 0
    for (var i = 0; i < siteBgs.length; i++) {
      var row = siteBgs[i], m = row.url.match(/\/roartransfer-brand\/(site\/[^?]+)$/)
      // only the ones that never went through shrink (made light ones are WebP or a small JPEG)
      if (!m || /\.webp$/i.test(m[1])) continue
      try {
        var h = await fetch(row.url, { method: 'HEAD' })
        if (Number(h.headers.get('content-length')) <= 1.5 * 1024 * 1024) continue
        var blob = await (await fetch(row.url)).blob()
        var u = await upPic(new File([blob], m[1].split('/').pop(), { type: blob.type }), 'site')
        var r = await sb.from('roar_transfer_backgrounds').update({ url: u }).eq('id', row.id)
        if (r.error) throw new Error(r.error.message)
        await sb.storage.from(BRAND_BUCKET).remove([m[1]])
        heavy++
      } catch (x) {}
    }
    if (heavy) loadSiteBgs()
  }
  function paintAdmBg() {
    if (!$('adm-bgs') || !isAdmin) return
    $('adm-bg-sub').textContent = pw('bgSub')
    var l = siteBgs || []
    $('adm-bg-n').textContent = $('tc-bg').textContent = fmtN(l.length)
    $('adm-bgs').innerHTML = l.map(function (b) { return '<div class="tile"><img src="' + esc(b.url) + '" alt="" loading="lazy"><button type="button" class="x" data-bgrm="' + esc(b.id) + '" aria-label="Remove"><svg><use href="#i-x"/></svg></button></div>' }).join('')
      + '<button type="button" class="add" id="adm-bg-add"' + (bgBusy ? ' disabled' : '') + '><svg><use href="#i-up"/></svg>' + pw('bAdd') + '</button>'
    slimBgs()
  }
  $('adm-bgs').addEventListener('click', async function (e) {
    if (e.target.closest('#adm-bg-add')) { $('adm-bg-file').click(); return }
    var x = e.target.closest('[data-bgrm]'); if (!x) return
    var b = (siteBgs || []).filter(function (y) { return y.id === x.dataset.bgrm })[0]
    if (!b || !window.confirm(pw('bgAsk'))) return
    x.disabled = true
    var r = await sb.from('roar_transfer_backgrounds').delete().eq('id', b.id)
    if (r.error) { x.disabled = false; $('adm-bg-err').textContent = r.error.message; $('adm-bg-err').hidden = false; return }
    var m = b.url.match(/roartransfer-brand\/(site\/[^?]+)$/)
    if (m) sb.storage.from(BRAND_BUCKET).remove([m[1]]).catch(function () {})
    loadSiteBgs()
  })
  $('adm-bg-file').addEventListener('change', async function (e) {
    var fl = [].slice.call(e.target.files || []); e.target.value = ''
    if (!fl.length) return
    $('adm-bg-err').hidden = true; bgBusy = true; paintAdmBg()
    var top = (siteBgs || []).reduce(function (a, b) { return Math.max(a, b.sort || 0) }, 0)
    for (var i = 0; i < fl.length; i++) {
      try {
        var u = await upPic(fl[i], 'site')
        var r = await sb.from('roar_transfer_backgrounds').insert({ url: u, sort: top + i + 1 })
        if (r.error) throw new Error(r.error.message)
      } catch (x) { $('adm-bg-err').textContent = x.message; $('adm-bg-err').hidden = false }
    }
    bgBusy = false; loadSiteBgs()
  })


  // ---- Admin > Website (Alex, 25 Oct): roartransfer.com's own visitor numbers, roar_site_stats ----
  var web = { tab: 'tx', days: '0', s: null, err: '' }
  // panes (Alex, 26 Oct): a row of tabs over parts of one page; the shown part fades up and away (0.2 s), the title
  // fades over, the chosen one rises in part by part. Used by Admin and by a Pro's My Pro transfers.
  function panes(segId, map, state, after, titled) {
    var t = 0
    segs(segId, function (f) {
      var b = $(segId).querySelector('[data-f="' + f + '"]')
      if (b && $(segId).scrollWidth > $(segId).clientWidth) b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      if (f === state.tab) return
      var out = $(map[state.tab])
      if (out) out.classList.add('leaving')
      if (titled) titled.forEach(function (id) { $(id).classList.add('leaving') })
      clearTimeout(t)
      t = setTimeout(function () {
        if (out) out.classList.remove('leaving')
        state.tab = f; showPane(map, state.tab); after(f)
        if (titled) titled.forEach(function (id) { var e = $(id); e.classList.remove('leaving', 'rp'); void e.offsetWidth; e.classList.add('rp') })
      }, 190)
    })
  }
  function showPane(map, tab) { for (var k in map) { var e = $(map[k]); if (e) e.hidden = k !== tab } }
  var ADM = { ov: 'pane-ov', all: 'pane-all', acc: 'pane-acc', pro: 'pane-pro', bg: 'pane-bg', web: 'adm-web' }
  var AT = { ov: ['ad.title', 'ad.sub'], all: ['h.all', 's.all'], acc: ['h.acc', 's.acc'], pro: ['h.pro', 's.pro'], bg: ['h.bg', 's.bg'], web: ['webH', 'webSub'] }
  web.tab = 'ov'
  panes('adm-tab', ADM, web, function (f) { paintWebTab(); if (f === 'web') loadWeb() }, ['adm-h1', 'adm-sub'])
  segs('web-seg', function (f) { web.days = f; web.s = null; paintWeb(); loadWeb() })
  segs('tx-seg', function (f) {
    adm.days = f; adm.stats = null; paintStats()
    sb.rpc('roar_admin_transfer_stats', { days: Number(f) }).then(function (r) { if (r.error) admErr(r.error.message); else { adm.stats = r.data; paintStats() } })
  })
  // each pane's own title and the line under it
  function paintWebTab() {
    var k = AT[web.tab] || AT.ov, D = lang === 'el' ? EL : EN
    $('adm-h1').innerHTML = D[k[0]] || EN[k[0]] || pw(k[0])
    $('adm-sub').textContent = D[k[1]] || EN[k[1]] || pw(k[1])
  }
  function loadWeb() {
    if (!isAdmin) return
    sb.rpc('roar_site_stats', { days: Number(web.days) }).then(function (r) {
      web.err = r.error ? (/roar_site_stats|function/i.test(r.error.message) ? pw('wNoSql') : r.error.message) : ''
      web.s = r.error ? null : r.data || {}; paintWeb()
      ;['web-facts', 'web-chart', 'web-co', 'web-ref', 'web-pg', 'web-dev', 'web-lang'].forEach(function (id, n) { var e = $(id); e.classList.remove('rp'); void e.offsetWidth; e.style.animationDelay = n * 40 + 'ms'; e.classList.add('rp') })
    })
  }
  function webRows(list, name, key) {
    list = list || []
    var top = Math.max.apply(null, list.map(function (x) { return Number(x[key || 'n']) }).concat([1]))
    return list.length ? list.map(function (x, n) {
      var v = Number(x[key || 'n'])
      return '<li class="web-row"><span class="rank">' + (n + 1) + '</span><span class="wb"><b>' + esc(name(x)) + '</b><s style="width:' + Math.max(3, v / top * 100) + '%"></s></span><em>' + fmtN(v) + '</em></li>'
    }).join('') : note(pw('wNone'))
  }
  function paintWeb() {
    $('web-err').hidden = !web.err; $('web-err').textContent = web.err
    var s = web.s
    if (!s) { $('web-facts').innerHTML = ''; $('web-chart').innerHTML = ''; ['web-co', 'web-ref', 'web-pg', 'web-dev', 'web-lang'].forEach(function (id) { $(id).innerHTML = web.err ? '' : loading }); return }
    var vis = Number(s.visitors || 0), views = Number(s.views || 0)
    $('web-facts').innerHTML = tile('i-user', fmtN(vis), pw('wVis') + ' · ' + pw('wPer')(vis ? (views / vis).toFixed(1) : '0'))
      + tile('i-file', fmtN(views), pw('wViews')) + tile('i-cal', fmtN(s.today_visitors), pw('wToday')(s.today_visitors, fmtN(s.today_views)))
      + tile('i-timer', fmtN(s.now), pw('wNow') + ' · ' + fmtN(s.returning) + ' ' + pw('wRet'))
    var days = s.days || [], max = Math.max.apply(null, days.map(function (d) { return Number(d.visitors) }).concat([1]))
    $('web-chart').innerHTML = '<div class="cols" style="grid-template-columns:repeat(' + Math.max(1, days.length) + ',minmax(0,1fr))">' + days.map(function (d) {
      var v = Number(d.visitors)
      return '<i' + (v ? '' : ' class="z"') + ' style="height:' + (v ? Math.max(4, v / max * 100) : 2) + '%" title="' + esc(dayD(String(d.day).slice(0, 10)) + ': ' + fmtN(v) + ' ' + pw('wVis') + ' · ' + fmtN(d.views) + ' ' + pw('wViews')) + '"></i>'
    }).join('') + '</div>' + (days.length ? '<div class="ax"><span>' + dayD(String(days[0].day).slice(0, 10)) + '</span><span>' + dayD(String(days[days.length - 1].day).slice(0, 10)) + '</span></div>' : '')
    $('web-co').innerHTML = webRows(s.countries, function (x) { return country(x.country) })
    $('web-ref').innerHTML = webRows(s.refs, function (x) { return x.ref })
    $('web-pg').innerHTML = webRows(s.pages, function (x) { return (pw('pages') || {})[x.page] || x.page }, 'vs')
    $('web-dev').innerHTML = webRows(s.devices, function (x) { return x.device })
    $('web-lang').innerHTML = webRows(s.langs, function (x) { return x.lang === 'el' ? 'Ελληνικά' : x.lang === 'en' ? 'English' : x.lang })
  }

  // this page's own visit, counted once per load (not for the admins' browsers)
  function siteHit() {
    try {
      if (localStorage.getItem('rt-admin')) return
      var v = localStorage.getItem('rt-vid')
      if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('rt-vid', v) }
      var q = new URLSearchParams(location.search), r = q.get('utm_source') || ''
      if (!r && document.referrer) { try { r = new URL(document.referrer).hostname.replace(/^www\./, '') } catch (e) {} }
      if (/(^|\.)roartransfer\.com$/.test(r)) r = ''
      fetch(URL_ + '/rest/v1/rpc/roar_site_hit', { method: 'POST', keepalive: true, headers: { apikey: KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ v: v, p: getting ? 'link' : dropping ? 'receive' : 'home', r: r, l: lang }) }).catch(function () {})
    } catch (e) {}
  }

  // ---- the download page (?t=…): name, size, a preview, the expiry, Download; opens and downloads are counted
  // for the sender's panel (keepalive: the click starts the file at once and an ordinary request would be dropped) ----
  var got = null, gotFiles = []
  function countHit(t, dl) {
    fetch(URL_ + '/rest/v1/rpc/roar_transfer_hit', { method: 'POST', keepalive: true, headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ t: t, dl: dl }) }).catch(function () {})
  }
  function fetchFile(f) {
    var a = document.createElement('a')
    a.href = f.url; a.setAttribute('download', f.name || ''); a.rel = 'noopener'
    document.body.appendChild(a); a.click(); a.remove()
    if (!f.counted) countHit(f.token, true)
  }
  // ---- Save to Photos on an iPhone (Alex, 22 Oct). A web page cannot write to Photos itself; the share sheet can
  // ("Save Video" / "Save Image"). The files are first fetched into the page (the tap that starts it), then a second
  // tap opens the share sheet, since iOS only opens it right after a tap. Pictures and mp4/mov videos, up to 2 GB.
  var IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // Safari on an iPhone holds the whole file in memory to hand it to Photos; past about 150 MB the tab crashes ("A problem
  // repeatedly occurred", Alex 14 Nov, a 517 MB video), so bigger ones download to Files instead
  var PH_MAX = 150 * 1024 * 1024
  var ph = { state: 'idle', files: null, pct: 0 }
  var photoable = function (f) { return /^image\/(jpeg|png|heic|heif|gif|webp)$/i.test(f.type || '') || /^video\/(mp4|quicktime|x-m4v)$/i.test(f.type || '') || /\.(jpe?g|png|heic|mp4|mov|m4v)$/i.test(f.name || '') }
  function canPhotos() {
    if (!IOS || !navigator.canShare || !window.File || !gotFiles.length) return false
    var total = gotFiles.reduce(function (n, f) { return n + Number(f.size || 0) }, 0)
    return total <= PH_MAX && gotFiles.every(photoable)
  }
  function paintPhotos() {
    var on = canPhotos()
    $('get-photos').hidden = !on
    if (on) $('get-go').hidden = true
    if (!on) return
    var b = $('get-photos'), t = b.querySelector('span')
    b.disabled = ph.state === 'loading'
    t.textContent = ph.state === 'loading' ? w('phPrep')(ph.pct) : ph.state === 'ready' ? w('phReady') : ph.state === 'done' ? w('phDone') : w('phSave')
    b.classList.toggle('ok', ph.state === 'ready')
  }
  async function prepPhotos() {
    ph.state = 'loading'; ph.pct = 0; paintPhotos()
    var total = gotFiles.reduce(function (n, f) { return n + Number(f.size || 0) }, 0) || 1, got = 0, out = []
    try {
      for (var i = 0; i < gotFiles.length; i++) {
        // through roartransfer.com itself (the Worker's /__dl/), as Download all does: R2 refuses the page after the
        // link's redirect ("Load failed" on an iPhone, Alex 10 Nov); the file's own address if that does not answer
        var f = gotFiles[i], r = await zipOpen({ url: zipSrc(f), alt: f.url })
        if (!r.ok || !r.body) throw new Error('HTTP ' + r.status)
        var rd = r.body.getReader(), parts = []
        for (;;) {
          var c = await rd.read(); if (c.done) break
          parts.push(c.value); got += c.value.length
          var p = Math.min(99, Math.floor(got / total * 100)); if (p !== ph.pct) { ph.pct = p; paintPhotos() }
        }
        out.push(new File(parts, f.name || 'file', { type: f.type || r.headers.get('content-type') || 'application/octet-stream' }))
      }
      if (!navigator.canShare({ files: out })) throw new Error('canShare')
      ph.files = out; ph.state = 'ready'
    } catch (e) {
      ph.state = 'idle'; ph.files = null; paintPhotos()
      if (confirm(w('phFail') + '\n(' + ((e && (e.name + ': ' + e.message)) || 'error') + ')')) gotFiles.forEach(function (f) { if (!f.used) fetchFile(f) })
      return
    }
    paintPhotos()
  }
  $('get-photos').addEventListener('click', function () {
    if (ph.state === 'idle' || ph.state === 'done') { prepPhotos(); return }
    if (ph.state !== 'ready') return
    navigator.share({ files: ph.files }).then(function () {
      ph.state = 'done'; gotFiles.forEach(function (f) { if (!f.counted) countHit(f.token, true) }); paintPhotos(); sendBack()
    }).catch(function (e) { if (e && e.name !== 'AbortError' && confirm(w('phFail') + '\n(' + e.name + ')')) gotFiles.forEach(function (f) { if (!f.used) fetchFile(f) }) })
  })
  var getPw = '', autoDl = location.hash === '#dl'
  // a file kept only in pCloud (Alex, 22 Oct): pCloud's direct address works only for the browser that asks for it,
  // so the page asks pCloud's public API itself, without a Referer (pCloud refuses a foreign one), for the download
  // address and, for a video or a picture, one to show it
  async function pcResolve(d) {
    var one = async function (f) {
      if (!f || !f.pcloud) return
      var ask = async function (dl) {
        var r = await fetch('https://' + f.pcloud.host + '/getpublinkdownload?code=' + encodeURIComponent(f.pcloud.code) + (dl ? '&forcedownload=1' : ''), { referrerPolicy: 'no-referrer' })
        var j = await r.json()
        return j.result === 0 && j.hosts && j.hosts.length ? 'https://' + j.hosts[0] + j.path : ''
      }
      try {
        var u = await ask(true)
        if (u) f.url = u
        if (/^(video|image|audio)\//.test(f.type || '')) f.view = await ask(false)
      } catch (e) { /* the pCloud page itself stays as url */ }
    }
    if (d && !d.error) { await one(d); if (d.files) await Promise.all(d.files.map(one)) }
    return d
  }
  // while it waits for the payment: quietly ask again, and open the page as usual once it is unlocked
  var payTimer = 0
  async function payAgain() {
    var hd = {}
    try { var s0 = (await sb.auth.getSession()).data.session; if (s0) hd.Authorization = 'Bearer ' + s0.access_token } catch (e) {}
    fetch(URL_ + '/functions/v1/roar-transfer-get?t=' + encodeURIComponent(getToken) + (getPw ? '&p=' + encodeURIComponent(getPw) : ''), { headers: hd })
      .then(function (r) { return r.json() })
      .then(function (d) { if (d.error === 'payment') payTimer = setTimeout(payAgain, 30000); else load() })
      .catch(function () { payTimer = setTimeout(payAgain, 30000) })
  }
  async function load() {
    $('get-wait').hidden = false
    // signed in, the page says who asks: an ended link then gives its one last download
    var hd = {}
    try { var s0 = (await sb.auth.getSession()).data.session; if (s0) hd.Authorization = 'Bearer ' + s0.access_token } catch (e) {}
    fetch(URL_ + '/functions/v1/roar-transfer-get?t=' + encodeURIComponent(getToken) + (getPw ? '&p=' + encodeURIComponent(getPw) : ''), { headers: hd })
      .then(function (r) { return r.json() })
      .then(pcResolve)
      .then(function (d) {
        got = d; if (!d.error) countHit(getToken, false); paintGet()
        // Download in the email (roartransfer.com/<token>#dl, Alex 21 Oct): the download starts by itself, once
        if (!d.error && autoDl) { autoDl = false; if (canPhotos()) return; try { history.replaceState(null, '', location.pathname + location.search) } catch (e) {} setTimeout(function () { $('get-go').click() }, 400) }
      })
      .catch(function () { got = { error: 'offline' }; paintGet() })
  }
  function paintGet() {
    if (got) useBrand(got.brand, 'get')
    if (!got) return
    $('get-wait').hidden = true
    // who sent it and the title; with a password, only those until the password is right
    $('get-title').hidden = !got.title; $('get-title').textContent = got.title || ''
    $('get-msg').hidden = !got.message; $('get-msg').textContent = got.message || ''
    var locked = got.error === 'password'
    $('get-pwf').hidden = !locked
    if (locked) {
      ;['get-ic', 'get-h', 'get-n', 'get-list', 'get-exp', 'get-go', 'get-vid', 'get-img', 'get-photos'].forEach(function (id) { $(id).hidden = true })
      $('get-sub').hidden = !got.from; $('get-sub').textContent = got.from ? w('gFrom')(got.from) : ''
      $('get-pwh').textContent = w('gLocked'); $('get-pw').placeholder = w('gPw'); $('get-pwgo').querySelector('span').textContent = w('gOpen')
      $('get-pwe').hidden = !got.wrong && !got.slow; $('get-pwe').textContent = got.slow ? w('gSlow') : w('gWrong')
      return
    }
    // awaiting payment (Alex, 10 Nov 2026): a kind word, who sent it, the title and the files greyed, nothing to press;
    // roar-transfer-get gives no address while it is locked. The page asks again every 30 s, so it opens by itself.
    var pay = got.error === 'payment'
    $('get-pay').hidden = !pay
    $('get-list').classList.toggle('paylock', pay)
    clearTimeout(payTimer)
    if (pay) {
      ;['get-ic', 'get-h', 'get-n', 'get-grace', 'get-last', 'get-exp', 'get-go', 'get-vid', 'get-img', 'get-photos'].forEach(function (id) { $(id).hidden = true })
      var pf = got.files || []
      $('get-sub').hidden = !got.from
      $('get-sub').textContent = got.from ? w('gFrom')(got.from) + (pf.length > 1 ? ' ' + pf.length + ' ' + w('files') + ' · ' + size(pf.reduce(function (n, f) { return n + Number(f.size || 0) }, 0)) : '') : ''
      $('get-list').hidden = !pf.length
      $('get-list').innerHTML = pf.map(function (f) {
        return '<li><span class="fi"><svg><use href="#' + icon(f.type || '') + '"/></svg></span><span class="ft"><b>' + esc(f.name || 'file') + '</b><small>' + size(f.size) + '</small></span><span class="lk" aria-hidden="true"><svg><use href="#i-lock"/></svg></span></li>'
      }).join('')
      payTimer = setTimeout(payAgain, 30000)
      return
    }
    var bad = !!got.error
    var offer = bad && got.grace && !user
    $('get-ic').hidden = !bad || offer; $('get-h').hidden = !bad || offer; $('get-n').hidden = !bad
    $('get-grace').hidden = !offer
    $('get-last').hidden = bad || !got.last
    $('get-sub').hidden = bad
    ;['get-list', 'get-exp', 'get-go'].forEach(function (id) { $(id).hidden = bad })
    $('get-photos').hidden = true
    if (bad) {
      var k = got.error === 'expired' ? 'gGone' : got.error === 'used' ? 'gUsed' : got.error === 'offline' ? 'gOff' : 'gBad'
      $('get-ic').innerHTML = '<svg><use href="#' + (k === 'gGone' ? 'i-timer' : 'i-x') + '"/></svg>'
      $('get-h').textContent = w(k); $('get-n').textContent = w(k + 'N')
      if (got.grace && !user) $('get-n').hidden = true
      $('get-vid').hidden = true; $('get-img').hidden = true
      return
    }
    // one file (an older link) or the whole upload (one link for many)
    gotFiles = got.files || [{ token: getToken, name: got.name, size: got.size, type: got.type, url: got.url, view: got.view, counted: got.counted, used: got.used, left: got.left }]
    // every file downloaded as many times as it may be (Alex, 23 Oct): shown like an ended link
    if (gotFiles.every(function (f) { return f.used })) { got = { error: 'used', title: got.title, message: got.message }; paintGet(); return }
    var one = gotFiles.length === 1 ? gotFiles[0] : null
    var vid = one && /^video\//.test(one.type || ''), img = one && /^image\//.test(one.type || '')
    if (vid && one.view && !$('get-vid').src) $('get-vid').src = one.view
    if (img && one.view && !$('get-img').src) $('get-img').src = one.view
    $('get-vid').hidden = !(vid && one.view); $('get-img').hidden = !(img && one.view)
    $('get-sub').textContent = got.from
      ? w('gFrom')(got.from) + (gotFiles.length > 1 ? ' ' + gotFiles.length + ' ' + w('files') + ' · ' + size(gotFiles.reduce(function (n, f) { return n + Number(f.size || 0) }, 0)) : '')
      : gotFiles.length > 1 ? w('gSubMany')(gotFiles.length, size(gotFiles.reduce(function (n, f) { return n + Number(f.size || 0) }, 0))) : w('gSubOne')
    $('get-list').innerHTML = gotFiles.map(function (f, n) {
      return '<li' + (f.used ? ' class="used"' : '') + '><span class="fi"><svg><use href="#' + icon(f.type || '') + '"/></svg></span><span class="ft"><b>' + esc(f.name || 'file') + '</b><small>' + size(f.size) + (f.used ? ' · ' + w('gUsed') : f.left != null ? ' · ' + w('gLeft')(Number(f.left) || 0) : '') + '</small></span>'
        + (gotFiles.length > 1 && !f.used ? '<a class="getdl" href="' + esc(f.url) + '" download="' + esc(f.name || '') + '" data-n="' + n + '" title="' + esc(w('gOne')) + '" aria-label="' + esc(w('gOne')) + '"><svg><use href="#i-down"/></svg></a>' : '') + '</li>'
    }).join('')
    // the last download says nothing about how long it stays (Alex, 26 Oct: kept 5 days, not shown)
    $('get-exp').hidden = !!got.last
    var ms = new Date(got.expires).getTime()
    $('get-exp').querySelector('span').textContent = w('gExpires') + ' ' + day(ms) + ' ' + hour(ms)
    $('get-go').querySelector('span').textContent = gotFiles.length > 1 ? w('gAll') : w('gGo')
    $('get-go').href = one ? one.url : '#'
    if (one) $('get-go').setAttribute('download', one.name || ''); else $('get-go').removeAttribute('download')
    if (zipping) zipLabel(w('zGo')); else zipSoon()
    paintPhotos()
  }
  // ---- Download all as one .zip (Alex, 1 Nov 2026). zip.js writes it (stored, no compression, zip64 past 4 GB).
  // Where the browser can, zip-sw.js (scope /__zip/ only) streams it straight to the disk, any size, with the browser's
  // own progress; Safari, or no service worker: made in memory up to ZIP_MEM; past that, or when it fails, one by one.
  var ZIP_MEM = (IOS ? 1 : 2) * 1024 * 1024 * 1024
  var SAFARI = /Safari\//.test(navigator.userAgent) && !/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|Edg\/|EdgiOS\/|Android/.test(navigator.userAgent)
  var zipping = false
  function zipName() {
    var t = String((got && got.title) || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    return (t || 'RoarTransfer ' + getToken) + '.zip'
  }
  function zipLabel(txt) { $('get-go').querySelector('span').textContent = txt || w('gAll') }
  function oneByOne(list) {
    var i = 0
    ;(function next() { if (i >= list.length) return; fetchFile(list[i++]); setTimeout(next, 1200) })()
  }
  // a file read for the zip comes through roartransfer.com itself (cloudflare/worker.js /__dl/): R2 answers a page
  // only from its own site, and the link's address goes on to R2 by a redirect, after which the browser no longer says
  // which site asks ("Load failed" in Safari, 1 Nov). Not through here (pCloud, older files): their own address.
  function zipSrc(f) {
    try {
      var u = new URL(f.url)
      if (/\/functions\/v1\/roar-transfer-get$/.test(u.pathname) && u.searchParams.get('dl') === '1' && /^[A-Za-z0-9]{6,32}$/.test(u.searchParams.get('t') || ''))
        return location.origin + '/__dl/' + u.searchParams.get('t') + (u.searchParams.get('c') ? '?c=' + encodeURIComponent(u.searchParams.get('c')) : '')
    } catch (e) {}
    return f.url
  }
  // the page's own copy of how a file is read (Safari kept an older zip.js without RTZip.open: "open is not a function",
  // 1 Nov): through the site first, the file's own address if that does not answer
  function zipOpen(f) {
    var get = function (u) { return fetch(u, { mode: 'cors', cache: 'no-store', credentials: 'omit' }) }
    return get(f.url).then(function (r) {
      if (r.ok && r.body && !/text\/html/.test(r.headers.get('content-type') || '')) return r
      return f.alt && f.alt !== f.url ? get(f.alt) : r
    }, function (er) { if (f.alt && f.alt !== f.url) return get(f.alt); throw er })
  }
  function zipWorker() {
    if (SAFARI || !window.RTZip || !('serviceWorker' in navigator) || !window.ReadableStream || !window.TransformStream) return Promise.resolve(null)
    return navigator.serviceWorker.register('/zip-sw.js?v=3', { scope: '/__zip/', updateViaCache: 'none' }).then(function (reg) {
      var sw = reg.active || reg.waiting || reg.installing
      if (!sw) return null
      if (sw.state === 'activated') return sw
      return new Promise(function (ok) {
        var t = setTimeout(function () { ok(null) }, 8000)
        sw.addEventListener('statechange', function () { if (sw.state === 'activated') { clearTimeout(t); ok(sw) } else if (sw.state === 'redundant') { clearTimeout(t); ok(null) } })
      })
    }).catch(function () { return null })
  }
  // a link with many files gets the worker ready while they look at the list, so the click starts at once
  var zipSw = null
  function zipSoon() { if (!zipSw && gotFiles.length > 1) zipSw = zipWorker() }
  async function zipAll() {
    if (zipping) return
    var list = gotFiles.filter(function (f) { return !f.used })
    if (!list.length) return
    if (list.length === 1 || !window.RTZip) { oneByOne(list); return }
    var total = list.reduce(function (n, f) { return n + Number(f.size || 0) }, 0) || 1
    var files = list.map(function (f) { return { name: f.name || 'file', url: zipSrc(f), alt: f.url, size: Number(f.size) } })
    var count = function () { list.forEach(function (f) { if (!f.counted) countHit(f.token, true) }) }
    var fail = function (er) {
      zipping = false; zipLabel()
      if (confirm(w('zFail') + (er ? '\n(' + er + ')' : ''))) oneByOne(list)
    }
    zipping = true
    var sw = await (zipSw || (zipSw = zipWorker()))
    if (sw) {
      var id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      var ch = new MessageChannel(), ping = null, fr = null
      var stop = function () { clearInterval(ping); setTimeout(function () { if (fr) fr.remove() }, 4000); zipping = false; zipLabel() }
      var ready = await new Promise(function (ok) {
        var t = setTimeout(function () { ok(false) }, 4000)
        ch.port1.onmessage = function (m) {
          var d = m.data || {}
          if (d.ok) { clearTimeout(t); ok(true) }
          else if (d.bytes) zipLabel(w('zPrep')(Math.min(99, Math.floor(d.bytes / total * 100))))
          else if (d.done) stop()
          else if (d.error) { stop(); fail(d.error) }
        }
        sw.postMessage({ zip: true, id: id, name: zipName(), files: files }, [ch.port2])
      })
      if (ready) {
        zipLabel(w('zGo'))
        // the browser stops an idle worker; a word every 10 s keeps it going while the zip is made
        ping = setInterval(function () { try { sw.postMessage({ ping: 1 }) } catch (er) {} }, 10000)
        fr = document.createElement('iframe'); fr.hidden = true
        fr.src = '/__zip/' + id + '/' + encodeURIComponent(zipName())
        document.body.appendChild(fr)
        count()
        return
      }
    }
    // no worker: in memory, when it fits
    if (total > ZIP_MEM) { zipping = false; oneByOne(list); return }
    try {
      zipLabel(w('zPrep')(0))
      var rd = RTZip.stream(files, zipOpen, function (n) { zipLabel(w('zPrep')(Math.min(99, Math.floor(n / total * 100)))) }).getReader()
      var parts = []
      for (;;) { var c = await rd.read(); if (c.done) break; parts.push(c.value) }
      var url = URL.createObjectURL(new Blob(parts, { type: 'application/zip' }))
      var a = document.createElement('a'); a.href = url; a.download = zipName(); document.body.appendChild(a); a.click(); a.remove()
      setTimeout(function () { URL.revokeObjectURL(url) }, 60000)
      count(); zipping = false; zipLabel()
    } catch (er) { fail(er && er.message) }
  }
  // after a download, a card that invites them to send their own (Alex, 22 Oct), a moment later so it does not jump
  function sendBack() {
    if (!$('get-back').hidden) return
    setTimeout(function () { $('get-back').hidden = false; $('get-send').hidden = true }, 1500)
  }
  if (getting) {
    show('v-get')
    // Download all (Alex, 1 Nov: "many files: show each one, but Download all as a zip"): one .zip of every file left
    $('get-go').addEventListener('click', function (e) {
      sendBack()
      if (gotFiles.length === 1) { if (gotFiles[0].used) { e.preventDefault(); return } if (!gotFiles[0].counted) countHit(gotFiles[0].token, true); return }
      e.preventDefault()
      zipAll()
    })
    $('get-list').addEventListener('click', function (e) { var a = e.target.closest('.getdl'); if (a) { countHit(gotFiles[+a.dataset.n].token, true); sendBack() } })
    $('get-pwf').addEventListener('submit', function (e) { e.preventDefault(); getPw = $('get-pw').value; if (getPw) { $('get-pwf').hidden = true; load() } })
    // Report abuse (Alex, 21 Oct): anyone can flag a transfer; the admins get an email (roartransfer-r2 'report')
    $('get-rep').addEventListener('click', function () {
      var why = window.prompt(w('repAsk'), ''); if (why == null) return
      var b = $('get-rep'); b.disabled = true
      bridge({ action: 'report', token: getToken, reason: why }).then(function () { b.querySelector('span').textContent = w('repDone') }).catch(function () { b.disabled = false })
    })
    $('get-eye').addEventListener('click', function () { $('get-pw').type = $('get-pw').type === 'password' ? 'text' : 'password' })
    load()
  }

  // ---- Pro (Alex, 23 Oct: "make my account Pro, so we add things there and see them") ----
  // the admins are Pro, and later whoever pays; roartransfer-r2 'pro' says so and gives what is theirs
  var PT = {
    en: {
      rxH: 'Receive files', rxN: 'Anyone can send you files on this page, without an account: up to 20 GB a file, kept 30 days.',
      copy: 'Copy link', copied: 'Copied', edit: 'Edit', save: 'Save', name: 'The name people see (e.g. The Mad Lions)', got: 'Received',
      noneGot: 'Nothing received yet. Your page’s link is in Settings: send it to someone and their files show up here.', open: 'Open', setUp: 'Pick a name for your page',
      files: function (n) { return n === 1 ? '1 file' : nf(n) + ' files' },
      drH: function (n) { return 'Send files to <b>' + esc(n) + '</b>.' }, drSub: 'No account needed. Up to 20 GB a file.',
      drB: 'Drop your files here', drS: 'or click to choose them', drMore: 'Add more files', from: 'Your name', mail: 'Your email (optional, so they can answer)',
      msg: 'Message (optional)', go: 'Send', noName: 'Write your name, so they know who sent it.', tooBig: 'Up to 20 GB a file.',
      ok: function (n) { return '<b>Sent.</b> ' + esc(n) + ' got an email with your files.' }, again: 'Send more files',
      gone: 'This page does not take files.', limit: 'Too many files from here today. Try again tomorrow.',
      pkH: 'What Pro gives', plFree: 'Free',
      stAdmin: 'Pro, lifetime (you are an admin)', mineSub: 'Everything you sent, from here, RoarMail and your chats. Your links last 1 to 30 days.', stEver: 'Pro, lifetime', stUntil: function (d) { return 'Pro until ' + d },
      pkRx: 'Receive files: your own page, up to 20 GB a file, kept 30 days', pkDl: 'Unlimited downloads',
      make: 'Make Pro', trial: 'Pro Trial', remove: 'Remove', again: 'Give again', admin: 'Admin · always', ever: 'Lifetime', until: function (d) { return 'Until ' + d },
      ended: function (d) { return 'Ended ' + d }, mail: 'Email of the account', none: 'No one is Pro yet.',
      sure: function (n) { return 'Remove Pro from ' + n + '? Their page stops taking files.' },
      pkGb: 'Up to 50 GB (1 day), 40 GB (3 days), 30 GB (7 days), 20 GB (30 days)', pkDays: 'Links up to 30 days', pkBrand: 'Your name, logo and backgrounds',
      pkEdit: 'Change expiry or password after sending', pkStats: 'Who opened and downloaded, when, from where', pkResume: 'Uploads resume after a lost connection',
      bH: 'Your brand', bN: 'Your name, logo and backgrounds on the pages people open from your links, and on your Receive-files page.',
      bName: 'Your name or company (e.g. The Mad Lions)', bLogo: 'Logo', bBgs: 'Backgrounds (up to 8, one shows at random)', bAdd: 'Add', bSaved: 'Saved.', bBgN: 'backgrounds', bNone: 'Not set',
      bBig: 'Pictures can be up to 10 MB.', details: 'Details', expT: 'Expires', pwNew: 'New password (empty keeps it as it is)', pwOff: 'Remove password',
      pwT: 'Password', pwHas: 'On', pwNo: 'None', pwSet: 'Add a password', pwChange: 'Type a new one', payOff: 'Off', actT: 'Activity',
      saveC: 'Save changes', locked: 'Has a password', payT: 'Locked until paid', payOn: 'Awaiting payment', noEv: 'Not opened yet.', evOpen: 'Opened', evDl: 'Downloaded', maxT: function (d) { return 'At most until ' + d },
      bgSub: 'The pictures behind every page; one shows at random on each visit. Pro accounts can use their own on their links.', bgAsk: 'Remove this background?',
      'h.all': 'Every <b>transfer</b>.', 's.all': 'Every file sent, newest first; tap an account under Accounts to see only theirs.',
      'h.acc': 'The <b>accounts</b>.', 's.acc': 'Who signed up or sent from RoarTransfer, and how much each one sent.',
      'h.pro': 'The <b>Pros</b>.', 's.pro': 'Make an account Pro for a month, a year or for life, or take it away.',
      'h.bg': 'The <b>backgrounds</b>.', 's.bg': 'The pictures behind every page; one shows at random on each visit.',
      webH: 'The <b>website</b>.', webSub: 'Who visits roartransfer.com: no cookies, no addresses, your own visits left out.',
      wVis: 'visitors', wViews: 'page views', wToday: function (v, n) { return 'today · ' + n + ' views' }, wNow: 'here right now', wWeek: 'last 7 days',
      wRet: 'came back another day', wPer: function (n) { return n + ' pages a visitor' }, wNone: 'No visits counted yet.',
      wNoSql: 'The counter is not in the database yet: run supabase/site-stats.sql in Supabase.',
      pages: { home: 'Home (send)', link: 'A download link', receive: 'A Receive-files page', about: 'About', el: 'Home in Greek', privacy: 'Privacy', terms: 'Terms', 'wetransfer-alternative': 'WeTransfer alternative', iphone: 'Send to iPhone', 'el/iphone': 'Send to iPhone (Greek)', 'el/wetransfer-alternative': 'WeTransfer alternative (Greek)' }
    },
    el: {
      rxH: 'Λήψη αρχείων', rxN: 'Οποιοσδήποτε σου στέλνει αρχεία σε αυτή τη σελίδα, χωρίς λογαριασμό: ως 20 GB το αρχείο, μένουν 30 μέρες.',
      copy: 'Αντιγραφή link', copied: 'Αντιγράφηκε', edit: 'Αλλαγή', save: 'Αποθήκευση', name: 'Το όνομα που βλέπουν (π.χ. The Mad Lions)', got: 'Ήρθαν',
      noneGot: 'Δεν ήρθε τίποτα ακόμα. Το link της σελίδας σου είναι στις Ρυθμίσεις: στείλ’ το σε κάποιον και τα αρχεία του θα εμφανιστούν εδώ.', open: 'Άνοιγμα', setUp: 'Διάλεξε όνομα για τη σελίδα σου',
      files: function (n) { return n === 1 ? '1 αρχείο' : nf(n) + ' αρχεία' },
      drH: function (n) { return 'Στείλε αρχεία στο <b>' + esc(n) + '</b>.' }, drSub: 'Χωρίς λογαριασμό. Ως 20 GB το αρχείο.',
      drB: 'Άφησε τα αρχεία σου εδώ', drS: 'ή πάτα για να τα διαλέξεις', drMore: 'Πρόσθεσε κι άλλα', from: 'Το όνομά σου', mail: 'Το email σου (προαιρετικά, για να σου απαντήσουν)',
      msg: 'Μήνυμα (προαιρετικά)', go: 'Αποστολή', noName: 'Γράψε το όνομά σου, για να ξέρουν ποιος το έστειλε.', tooBig: 'Ως 20 GB το αρχείο.',
      ok: function (n) { return '<b>Στάλθηκε.</b> Το ' + esc(n) + ' πήρε email με τα αρχεία σου.' }, again: 'Στείλε κι άλλα',
      gone: 'Αυτή η σελίδα δεν δέχεται αρχεία.', limit: 'Πάρα πολλά αρχεία από εδώ σήμερα. Δοκίμασε ξανά αύριο.',
      pkH: 'Τι δίνει το Pro', plFree: 'Free',
      stAdmin: 'Pro, lifetime (είσαι διαχειριστής)', mineSub: 'Ό,τι έστειλες, από εδώ, το RoarMail και τις συνομιλίες σου. Τα links σου ισχύουν 1 με 30 μέρες.', stEver: 'Pro, lifetime', stUntil: function (d) { return 'Pro ως ' + d },
      pkRx: 'Λήψη αρχείων: δική σου σελίδα, ως 20 GB το αρχείο, μένουν 30 μέρες', pkDl: 'Απεριόριστα κατεβάσματα',
      make: 'Κάνε Pro', trial: 'Pro Trial', remove: 'Αφαίρεση', again: 'Δώσε ξανά', admin: 'Διαχειριστής · για πάντα', ever: 'Lifetime', until: function (d) { return 'Ως ' + d },
      ended: function (d) { return 'Έληξε ' + d }, mail: 'Email του λογαριασμού', none: 'Κανείς δεν είναι Pro ακόμα.',
      sure: function (n) { return 'Να αφαιρεθεί το Pro από ' + n + '; Η σελίδα του σταματά να δέχεται αρχεία.' },
      pkGb: 'Ως 50 GB (1 μέρα), 40 GB (3 μέρες), 30 GB (7 μέρες), 20 GB (30 μέρες)', pkDays: 'Links ως 30 μέρες', pkBrand: 'Το όνομα, το λογότυπο και τα φόντα σου',
      pkEdit: 'Αλλαγή λήξης ή κωδικού μετά την αποστολή', pkStats: 'Ποιος άνοιξε και κατέβασε, πότε, από πού', pkResume: 'Το ανέβασμα συνεχίζει αν κοπεί η σύνδεση',
      bH: 'Το brand σου', bN: 'Το όνομα, το λογότυπο και τα φόντα σου στις σελίδες που ανοίγουν από τα links σου και στη σελίδα Λήψης αρχείων.',
      bName: 'Το όνομά σου ή της εταιρείας (π.χ. The Mad Lions)', bLogo: 'Λογότυπο', bBgs: 'Φόντα (ως 8, ένα εμφανίζεται τυχαία)', bAdd: 'Προσθήκη', bSaved: 'Αποθηκεύτηκε.', bBgN: 'φόντα', bNone: 'Δεν έχει οριστεί',
      bBig: 'Οι εικόνες μπορούν να είναι ως 10 MB.', details: 'Λεπτομέρειες', expT: 'Λήγει', pwNew: 'Νέος κωδικός (κενό τον αφήνει ως έχει)', pwOff: 'Αφαίρεση κωδικού',
      pwT: 'Κωδικός', pwHas: 'Ναι', pwNo: 'Κανένας', pwSet: 'Βάλε κωδικό', pwChange: 'Γράψε νέο', payOff: 'Όχι', actT: 'Ιστορικό',
      saveC: 'Αποθήκευση', locked: 'Έχει κωδικό', payT: 'Κλειδωμένο ως την πληρωμή', payOn: 'Αναμονή πληρωμής', noEv: 'Δεν έχει ανοιχτεί ακόμα.', evOpen: 'Άνοιξε', evDl: 'Κατέβηκε', maxT: function (d) { return 'Το πολύ ως ' + d },
      bgSub: 'Οι εικόνες πίσω από κάθε σελίδα· μία εμφανίζεται τυχαία σε κάθε επίσκεψη. Οι Pro βάζουν τις δικές τους στα links τους.', bgAsk: 'Να αφαιρεθεί αυτό το φόντο;',
      'h.all': 'Όλες οι <b>αποστολές</b>.', 's.all': 'Κάθε αρχείο που στάλθηκε, τα νεότερα πρώτα· πάτα έναν λογαριασμό στο Accounts για να δεις μόνο τα δικά του.',
      'h.acc': 'Οι <b>λογαριασμοί</b>.', 's.acc': 'Ποιοι γράφτηκαν ή έστειλαν από το RoarTransfer, και πόσα έστειλε ο καθένας.',
      'h.pro': 'Οι <b>Pro</b>.', 's.pro': 'Κάνε έναν λογαριασμό Pro για έναν μήνα, έναν χρόνο ή για πάντα, ή αφαίρεσέ το.',
      'h.bg': 'Τα <b>φόντα</b>.', 's.bg': 'Οι εικόνες πίσω από κάθε σελίδα· μία εμφανίζεται τυχαία σε κάθε επίσκεψη.',
      webH: 'Ο <b>ιστότοπος</b>.', webSub: 'Ποιοι επισκέπτονται το roartransfer.com: χωρίς cookies, χωρίς διευθύνσεις, χωρίς τις δικές σου επισκέψεις.',
      wVis: 'επισκέπτες', wViews: 'προβολές σελίδων', wToday: function (v, n) { return 'σήμερα · ' + n + ' προβολές' }, wNow: 'εδώ αυτή τη στιγμή', wWeek: 'τελευταίες 7 μέρες',
      wRet: 'ξαναήρθαν άλλη μέρα', wPer: function (n) { return n + ' σελίδες ανά επισκέπτη' }, wNone: 'Δεν έχουν μετρηθεί επισκέψεις ακόμα.',
      wNoSql: 'Ο μετρητής δεν είναι ακόμα στη βάση: τρέξε το supabase/site-stats.sql στο Supabase.',
      pages: { home: 'Αρχική (αποστολή)', link: 'Link λήψης', receive: 'Σελίδα Λήψης αρχείων', about: 'About', el: 'Αρχική στα ελληνικά', privacy: 'Απόρρητο', terms: 'Όροι', 'wetransfer-alternative': 'Εναλλακτική του WeTransfer', iphone: 'Αποστολή σε iPhone', 'el/iphone': 'Αποστολή σε iPhone (ελληνικά)', 'el/wetransfer-alternative': 'Εναλλακτική του WeTransfer (ελληνικά)' }
    }
  }
  var pw = function (k) { return PT[lang][k] }
  var pro = null, proEd = false
  // the account's own Pro, from roartransfer-pro (until when, admin or given)
  var FNP = URL_ + '/functions/v1/roartransfer-pro'
  async function proCall(body) {
    var s0 = (await sb.auth.getSession()).data.session
    var r = await fetch(FNP, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (s0 ? s0.access_token : '') }, body: JSON.stringify(body) })
    var d = {}; try { d = await r.json() } catch (e) {}
    if (!r.ok) throw new Error(d.error || ('Error ' + r.status))
    return d
  }
  var proMe = null
  function loadPro() {
    bridge({ action: 'pro' }).then(function (d) { pro = d && d.pro && viewAs !== 'free' ? d : null; if (pro && !pro.slug) proEd = true; paintPro() }).catch(function () { pro = null; paintPro() })
    proCall({ action: 'me' }).then(function (d) { proMe = viewAs === 'free' ? null : viewAs === 'pro' ? Object.assign({}, d, { admin: false }) : d; paintPro() }).catch(function () {})
  }
  function paintPro() {
    // a Pro's tab and title say Pro (Alex, 25 Oct)
    if (!PT) return
    var isPro = !!pro && !!user
    $('em-got-row').hidden = !isPro // only a Pro has a page people send files to
    // the PRO mark on the account at the top (Alex, 25 Oct)
    $('who-pro').hidden = !isPro
    // My transfers for everyone (Alex, 10 Nov: the PRO mark already says Pro)
    if (!isPro) $('mn-sub').textContent = (lang === 'el' ? EL : EN)['mn.sub'] || EN['mn.sub']
    // a Pro sees Sent and Received; everyone else only what they sent. A Pro's own things live in Settings.
    $('mine-tab').hidden = !isPro
    ;['set-rx', 'set-brand', 'set-perks'].forEach(function (id) { $(id).hidden = !isPro })
    paintSet()
    if (!isPro && mineT.tab !== 'sent') { mineT.tab = 'sent'; $('mine-tab').querySelectorAll('[data-f]').forEach(function (x) { x.classList.toggle('on', x.dataset.f === 'sent') }) }
    showPane(MINE, mineT.tab)
    if (!isPro) return
    var me = proMe || {}
    // what Pro gives (Alex, 25 Oct); the admin's pCloud option is never listed (Alex, 2 Nov)
    // what Pro gives as tiles with a check, two columns on a computer (Alex, 2 Nov: tidier than chips)
    $('pro-perks').innerHTML = ['pkGb', 'pkDays', 'pkDl', 'pkBrand', 'pkEdit', 'pkStats', 'pkResume', 'pkRx'].map(pw)
      .map(function (t) { return '<li><i><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i><span>' + esc(t) + '</span></li>' }).join('')
    $('pb-h').textContent = pw('bH'); $('pb-n').textContent = pw('bN')
    $('mn-sub').textContent = pw('mineSub')
    paintBrand()
    $('pro-h').textContent = pw('rxH'); $('pro-n').textContent = pw('rxN')
    var url = pro.slug ? 'roartransfer.com/u/' + pro.slug : pw('setUp')
    $('pro-link').textContent = url
    $('pro-copy').hidden = !pro.slug; $('pro-copy').querySelector('span').textContent = pw('copy')
    $('pro-edit').querySelector('span').textContent = pw('edit')
    $('pro-ed').hidden = !proEd
    $('pro-name').placeholder = pw('name'); $('pro-save').querySelector('span').textContent = pw('save')
    if (proEd && !$('pro-slug').value && document.activeElement !== $('pro-slug')) { $('pro-slug').value = pro.slug || ''; $('pro-name').value = pro.name || '' }
    $('set-perks-h').textContent = pw('pkH'); $('set-perks-n').textContent = '8'
    $('tc-got').textContent = pro.received.length ? fmtN(pro.received.length) : ''
    $('pro-list').innerHTML = pro.received.length ? pro.received.map(function (g) {
      return '<li><span class="fi"><svg><use href="#i-down"/></svg></span><span class="ft"><b>' + esc(g.sender_name) + '</b>'
        + '<small>' + (g.sender_email ? esc(g.sender_email) + ' · ' : '') + pw('files')(Number(g.files) || 0) + ' · ' + size(Number(g.bytes || 0)) + ' · ' + when(g.created_at) + '</small>'
        + (g.message ? '<span class="got-msg">' + esc(g.message) + '</span>' : '') + '</span>'
        + '<a class="pill sm" href="' + PAGE + esc(g.bundle) + '" target="_blank" rel="noopener"><svg><use href="#i-eye"/></svg><span>' + pw('open') + '</span></a></li>'
    }).join('') : note(pw('noneGot'))
  }
  $('pro-copy').addEventListener('click', function () {
    var b = $('pro-copy').querySelector('span')
    try { navigator.clipboard.writeText('https://roartransfer.com/u/' + pro.slug).then(function () { b.textContent = pw('copied'); setTimeout(paintPro, 1600) }) } catch (e) {}
  })
  $('pro-edit').addEventListener('click', function () { proEd = !proEd; $('pro-slug').value = pro.slug || ''; $('pro-name').value = pro.name || ''; paintPro() })
  $('pro-slug').addEventListener('input', function () { var v = $('pro-slug').value.toLowerCase().replace(/[^a-z0-9-]/g, ''); if (v !== $('pro-slug').value) $('pro-slug').value = v })
  $('pro-save').addEventListener('click', function () {
    $('pro-err').hidden = true; $('pro-save').disabled = true
    bridge({ action: 'pro-set', slug: $('pro-slug').value, name: $('pro-name').value }).then(function (d) {
      $('pro-save').disabled = false; pro.slug = d.slug; pro.name = d.name; proEd = false; paintPro()
    }).catch(function (e) { $('pro-save').disabled = false; $('pro-err').textContent = e.message; $('pro-err').hidden = false })
  })

  // ---- Settings (Alex, 10 Nov: "make a Settings section somewhere and put things in there") ----
  // the gear at the top: the account, the emails, and for a Pro their page, their brand and what Pro gives
  function paintSet() {
    $('set-mail').textContent = user ? user.email || '' : ''
    var isPro = !!pro && !!user, me = proMe || {}
    $('set-plan').textContent = !isPro ? pw('plFree') : me.admin ? pw('stAdmin') : me.until ? pw('stUntil')(dayY(me.until)) : pw('stEver')
    $('set-probadge').hidden = !isPro
    $('set-btn').setAttribute('aria-label', (lang === 'el' ? EL : EN)['set.h'] || 'Settings'); $('set-btn').title = $('set-btn').getAttribute('aria-label')
  }
  function setOpen() { paintSet(); $('sm').hidden = false; document.documentElement.classList.add('lm-on') }
  function setClose() { $('sm').hidden = true; if ($('lm').hidden) document.documentElement.classList.remove('lm-on') }
  $('set-btn').addEventListener('click', setOpen)
  $('sm').addEventListener('click', function (e) { if (e.target.closest('[data-smx]')) setClose() })
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sm').hidden) setClose() })
  $('set-out').addEventListener('click', function () { if (busy) return; setClose(); sb.auth.signOut() })
  // Your brand and What Pro gives stay folded until asked for, so the window stays short
  function fold(btn, body) {
    $(btn).addEventListener('click', function () {
      var open = $(body).hidden
      $(body).hidden = !open; $(btn).classList.toggle('open', open); $(btn).setAttribute('aria-expanded', open ? 'true' : 'false')
    })
  }
  fold('set-perks-t', 'pro-perks'); fold('set-brand-t', 'set-brand-b')

  // ---- Admin > Pro (Alex, 25 Oct: "give me somewhere to make someone Pro") ----
  var admPro = { list: null, months: '1' }
  var dayY = function (d) { return new Date(d).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }) }
  function proIds() { var o = {}; (admPro.list || []).forEach(function (p) { if (p.pro) o[p.id] = 1 }); return o }
  function loadAdmPro() {
    if (!isAdmin) return
    proCall({ action: 'list' }).then(function (d) { admPro.list = d.people || []; paintAdmPro(); paintAcc() })
      .catch(function (e) { $('adm-pro-err').textContent = e.message; $('adm-pro-err').hidden = false })
  }
  function paintAdmPro() {
    if (!admPro) return
    $('adm-pro-mail').placeholder = pw('mail')
    var l = admPro.list
    if (!l) { $('adm-pro').innerHTML = loading; $('adm-pro-n').textContent = ''; return }
    $('adm-pro-n').textContent = $('tc-pro').textContent = fmtN(l.filter(function (p) { return p.pro }).length)
    $('adm-pro').innerHTML = l.length ? l.map(function (p) {
      var st = p.admin ? '<i class="pro">' + pw('admin') + '</i>' : p.pro ? '<i class="pro">' + (p.until ? pw('until')(dayY(p.until)) : pw('ever')) + '</i>' : '<i class="bad">' + pw('ended')(dayY(p.until)) + '</i>'
      var btn = p.admin ? '' : p.pro ? '<button type="button" class="pill sm bad" data-rmpro="' + esc(p.id) + '"><span>' + pw('remove') + '</span></button>'
        : '<button type="button" class="pill sm" data-mkpro="' + esc(p.id) + '"><span>' + pw('again') + '</span></button>'
      return '<li>' + av(p) + '<span class="ft"><b>' + esc(nameOf(p)) + '</b><small>' + esc(p.email) + (p.slug ? ' · roartransfer.com/u/' + esc(p.slug) : '') + '</small>'
        + '<span class="chips">' + st + '</span></span>' + btn + '</li>'
    }).join('') : note(pw('none'))
  }
  function grantPro(who, btn, months) {
    $('adm-pro-err').hidden = true
    if (btn) btn.disabled = true
    proCall(Object.assign({ action: 'grant', months: months || Number(admPro.months) }, months ? { trial: true } : {}, who)).then(function (d) {
      // Pro Trial: the email with the gift went (roartransfer-pro sendTrial), or say it did not
      if (months && d && d.mailed === false) alert(w('trialNoMail'))
      if (btn) btn.disabled = false
      $('adm-pro-mail').value = ''; loadAdmPro()
    }).catch(function (e) { if (btn) btn.disabled = false; $('adm-pro-err').textContent = e.message; $('adm-pro-err').hidden = false; if (months) alert(e.message) })
  }
  segs('adm-pro-seg', function (f) { admPro.months = f })
  $('adm-pro-go').addEventListener('click', function () {
    var m = $('adm-pro-mail').value.trim()
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(m)) { $('adm-pro-err').textContent = w('badMail'); $('adm-pro-err').hidden = false; return }
    grantPro({ email: m }, $('adm-pro-go'))
  })
  $('adm-pro-mail').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('adm-pro-go').click() })
  $('adm-pro').addEventListener('click', function (e) {
    var mk = e.target.closest('[data-mkpro]'), rm = e.target.closest('[data-rmpro]')
    if (mk) grantPro({ id: mk.dataset.mkpro }, mk)
    if (rm) {
      var p = (admPro.list || []).filter(function (x) { return x.id === rm.dataset.rmpro })[0]
      if (!p || !confirm(pw('sure')(nameOf(p)))) return
      rm.disabled = true
      proCall({ action: 'revoke', id: p.id }).then(loadAdmPro).catch(function (er) { rm.disabled = false; $('adm-pro-err').textContent = er.message; $('adm-pro-err').hidden = false })
    }
  })

  // ---- the Receive-files page itself (roartransfer.com/u/<name>): drop files, your name, Send ----
  var inb = { name: '', files: [], done: false, gone: false }
  var DROP_MAX = 20 * GB
  function paintDrop() {
    $('dr-h').innerHTML = inb.gone ? pw('gone') : inb.name ? pw('drH')(inb.name) : ''
    $('dr-sub').textContent = inb.gone ? '' : pw('drSub')
    $('dr-form').hidden = inb.gone || inb.done; $('dr-done').hidden = !inb.done
    var has = inb.files.length > 0
    $('dr-b').textContent = has ? pw('drMore') : pw('drB'); $('dr-s').textContent = pw('drS')
    $('dr-drop').classList.toggle('has', has)
    $('dr-list').hidden = !has; $('dr-opts').hidden = !has; $('dr-go').hidden = !has; $('dr-agree').hidden = !has
    $('dr-list').innerHTML = inb.files.map(function (f, n) {
      return '<li><span class="fi"><svg><use href="#' + icon(f.type) + '"/></svg></span><span class="ft"><b>' + esc(f.name) + '</b><small' + (f.size > DROP_MAX ? ' class="bad"' : '') + '>' + size(f.size) + (f.size > DROP_MAX ? ' · ' + pw('tooBig') : '') + '</small></span>'
        + '<button type="button" class="x" data-n="' + n + '" aria-label="' + w('remove') + '"><svg><use href="#i-x"/></svg></button></li>'
    }).join('')
    $('dr-from').placeholder = pw('from'); $('dr-mail').placeholder = pw('mail'); $('dr-msg').placeholder = pw('msg')
    $('dr-go').querySelector('span').textContent = pw('go')
    $('dr-go').disabled = inb.files.some(function (f) { return f.size > DROP_MAX })
    $('dr-again').querySelector('span').textContent = pw('again')
    if (inb.done) $('dr-ok').innerHTML = pw('ok')(inb.name)
  }
  function dropAdd(list) { [].slice.call(list || []).forEach(function (f) { if (!inb.files.some(function (x) { return x.name === f.name && x.size === f.size })) inb.files.push(f) }); paintDrop() }
  $('dr-drop').addEventListener('click', function () { $('dr-pick').click() })
  $('dr-pick').addEventListener('change', function (e) { dropAdd(e.target.files); e.target.value = '' })
  ;['dragenter', 'dragover'].forEach(function (k) { $('dr-drop').addEventListener(k, function (e) { e.preventDefault(); $('dr-drop').classList.add('over') }) })
  $('dr-drop').addEventListener('dragleave', function () { $('dr-drop').classList.remove('over') })
  $('dr-drop').addEventListener('drop', function (e) { e.preventDefault(); $('dr-drop').classList.remove('over'); dropAdd(e.dataTransfer && e.dataTransfer.files) })
  $('dr-list').addEventListener('click', function (e) { var b = e.target.closest('.x'); if (b) { inb.files.splice(+b.dataset.n, 1); paintDrop() } })
  $('dr-again').addEventListener('click', function () { inb.done = false; inb.files = []; $('dr-msg').value = ''; paintDrop() })
  $('dr-go').addEventListener('click', async function () {
    if (busy || !inb.files.length) return
    var who = $('dr-from').value.trim()
    if (!who) { $('dr-err').textContent = pw('noName'); $('dr-err').hidden = false; $('dr-from').focus(); return }
    $('dr-err').hidden = true
    // the same upload as Send (16 MB pieces straight to R2), each file marked for this page
    files = inb.files.slice(); busy = true; stopped = false; sent = []; errs = []
    show('v-up'); progress(0)
    var before = 0
    for (var i = 0; i < files.length; i++) {
      if (stopped) break
      try { sent.push(await upOne(files[i], before)) } catch (e) {
        if (stopped || e.message === 'cancelled') break
        errs.push(files[i].name + ': ' + (e.limit ? pw('limit') : e.message === 'offline' ? w('offline') : e.message))
        if (e.limit) break
      }
      before += files[i].size; progress(before)
    }
    if (sent.length && !stopped) {
      try { await bridge({ action: 'inbox-send', inbox: dropSlug, tokens: sent.map(function (m) { return m.token }), name: who, email: $('dr-mail').value, message: $('dr-msg').value }); inb.done = true; inb.files = [] }
      catch (e) { errs.push(e.message) }
    }
    busy = false; files = []
    show('v-drop'); paintDrop()
    if (errs.length) { $('dr-form').hidden = false; $('dr-done').hidden = !inb.done; $('dr-err').textContent = errs.join(' · '); $('dr-err').hidden = false }
  })
  if (dropping) {
    var rb2 = document.querySelector('meta[name="robots"]'); if (rb2) rb2.content = 'noindex, nofollow'
    show('v-drop'); paintDrop()
    bridge({ action: 'inbox-info', inbox: dropSlug }).then(function (d) { inb.name = d.name; useBrand(d.brand, 'dr'); paintDrop() }).catch(function () { inb.gone = true; useBrand(null, 'dr'); paintDrop() })
  }

  // one of Alex's pictures behind the card, a new one each visit (Alex, 20 Oct; kept here in stills/, nothing from
  // elsewhere). A picture from one of our films can carry t / k / v to name the film at the top, with a link to it.
  var STILLS = [{ f: 'salon.webp' }, { f: 'shoes.webp' }, { f: 'tartan.webp' }, { f: 'corridor.webp' }, { f: 'sunflower.webp' }, { f: 'silhouette.webp' }]
  // (since 25 Oct the list lives in Admin > Backgrounds; these are only what shows if it cannot be read)
  var still = {}
  loadSiteBgs()
  function credit() { if (still.t) $('credit-t').textContent = still.t + ' · ' + still.k[lang] }
  var _setLang = setLang
  setLang = function (l) { _setLang(l); credit() }

  var saved = ''
  try { saved = localStorage.getItem('roartransfer.lang') || '' } catch (e) {}
  // the visitor's own language (Alex, 10 Nov): Greek for a Greek browser, or for someone in Greece or Cyprus
  var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch (e) {}
  var greek = (navigator.languages || [navigator.language || '']).some(function (l) { return /^el\b/i.test(l || '') }) || /^(Europe\/Athens|Asia\/Nicosia|Europe\/Nicosia)$/.test(tz)
  setLang(saved || (greek ? 'el' : 'en'))
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) document.querySelectorAll('.ios-tip').forEach(function (x) { x.hidden = false })
  siteHit()
})()
