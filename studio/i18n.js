// RoarTransfer Studio in Greek (Alex, 8 Nov 2026: "the whole project in Greek too"). The app is written in English; when
// the language is Greek this turns what is on screen into Greek as it appears: whole texts from EL, texts with numbers
// from RULES, and the placeholder, title and aria-label of every element. What people write (notes, titles, names,
// lyrics) is never touched: anything inside [data-notr], .body, .lyrics, textarea or input values stays as it is.
// The language is kept per device ('rs-lang'); the first time it follows the browser.
;(function () {
  var KEY = 'rs-lang'
  var lang = 'en'
  try { lang = localStorage.getItem(KEY) || ((navigator.language || '').toLowerCase().indexOf('el') === 0 ? 'el' : 'en') } catch (e) {}
  window.RSLang = { lang: lang, set: function (l) { try { localStorage.setItem(KEY, l) } catch (e) {} location.reload() } }
  document.documentElement.lang = lang
  if (lang !== 'el') return

  var EL = {
    // found by walking every page in Greek
    'RoarTransfer Studio home': 'Αρχική του RoarTransfer Studio', 'Change the cover': 'Άλλαξε το εξώφυλλο', 'Drop your first files here': 'Ρίξε εδώ τα πρώτα σου αρχεία', 'Mark as done': 'Σήμανση ως έγινε',
    'Upload every version, get notes on the exact second or frame, have it approved, and send the client one beautiful Finals folder with the files, the credits and your brand.': 'Ανέβασε κάθε εκδοχή, πάρε σημειώσεις στο ακριβές δευτερόλεπτο ή καρέ, πάρε έγκριση, και στείλε στον πελάτη έναν όμορφο φάκελο Finals με τα αρχεία, τους συντελεστές και το brand σου.',
    'Anyone with the link can listen in the browser, without an account.': 'Όποιος έχει το link ακούει στον browser, χωρίς λογαριασμό.',
    'No stems yet. Add vocals, drums, bass and the rest: they play together, each with mute and solo.': 'Κανένα stem ακόμα. Πρόσθεσε φωνή, ντραμς, μπάσο και τα υπόλοιπα: παίζουν μαζί, το καθένα με mute και solo.', 'No stems yet.': 'Κανένα stem ακόμα.',
    'Resolve: right-click the timeline > Timelines > Import > Timeline Markers from EDL. Premiere: File > Import the .xml, the markers come on a new sequence.': 'Resolve: δεξί κλικ στο timeline > Timelines > Import > Timeline Markers from EDL. Premiere: File > Import το .xml, οι markers έρχονται σε νέο sequence.',
    'Ask for a title before a new file, and a name before a new version': 'Ρώτα τίτλο πριν από νέο αρχείο και όνομα πριν από νέα εκδοχή', 'Someone leaves a note on your files': 'Κάποιος αφήνει σημείωση στα αρχεία σου',
    'Someone uploads a file or a new version': 'Κάποιος ανεβάζει αρχείο ή νέα εκδοχή', 'Approvals and finals': 'Εγκρίσεις και τελικά', 'A version is approved or made final': 'Μια εκδοχή εγκρίνεται ή γίνεται τελική',
    'Someone adds you to a project': 'Κάποιος σε προσθέτει σε project', 'Once a day': 'Μία φορά τη μέρα', 'One email a day instead of a few minutes after': 'Ένα email τη μέρα αντί για λίγα λεπτά μετά',
    'by': 'από', 'Search projects, files and notes': 'Αναζήτηση σε projects, αρχεία και σημειώσεις', 'Type at least two letters. Notes jump to their exact moment.': 'Γράψε τουλάχιστον δύο γράμματα. Οι σημειώσεις σε πάνε στο ακριβές σημείο.', 'Files': 'Αρχεία', 'safe for text': 'ασφαλές για κείμενο', 'Wipe': 'Διαχωρισμός', 'Fade': 'Σβήσιμο', 'Difference': 'Διαφορά', 'Pricing': 'Τιμές', 'Waiting list': 'Λίστα αναμονής', 'Make Pro': 'Κάνε Pro', '1 month': '1 μήνας', '1 year': '1 χρόνος', 'Always': 'Για πάντα', 'Give again': 'Δώσε ξανά', 'Copy emails': 'Αντιγραφή emails', 'Nobody yet.': 'Κανείς ακόμα.', 'Admin · always': 'Admin · για πάντα', 'Pro · always': 'Pro · για πάντα', 'Studio Pro taken away': 'Το Studio Pro αφαιρέθηκε', 'Emails copied': 'Τα emails αντιγράφηκαν',  'Change picture': 'Αλλαγή φωτογραφίας', 'Your picture': 'Η φωτογραφία σου', 'Picture saved': 'Η φωτογραφία αποθηκεύτηκε', 'My Roar account': 'Το Roar Account μου', 'Open RoarTransfer': 'Άνοιγμα RoarTransfer', 'Privacy': 'Απόρρητο', 'Terms': 'Όροι', 'Privacy & Terms': 'Απόρρητο & Όροι',
    'Projects': 'Projects', 'Settings': 'Ρυθμίσεις', 'Storage': 'Χώρος', 'Admin': 'Διαχείριση', 'Sign out': 'Αποσύνδεση', 'Account': 'Λογαριασμός',
    'Notifications': 'Ειδοποιήσεις', 'Send files with RoarTransfer': 'Στείλε αρχεία με το RoarTransfer', 'Beta': 'Beta',
    'Sign in': 'Σύνδεση', 'Sign in with Roar Account': 'Σύνδεση με Roar Account', 'Create an account': 'Δημιουργία λογαριασμού', 'Forgot password': 'Ξέχασες τον κωδικό;',
    'Email': 'Email', 'Password': 'Κωδικός', 'Your name': 'Το όνομά σου', 'or with email': 'ή με email', 'Two-step verification': 'Επαλήθευση δύο βημάτων',
    'Type the 6-digit code from your authenticator app.': 'Γράψε τον 6ψήφιο κωδικό από την εφαρμογή επαλήθευσης.', 'Verify': 'Επαλήθευση',
    'Allow it on your Roar account': 'Επίτρεψέ το στο Roar Account σου', 'A tab opened on themadlions.com. Check the code is the same there and press Allow.': 'Άνοιξε μια καρτέλα στο themadlions.com. Έλεγξε ότι ο κωδικός είναι ίδιος και πάτα Allow.',
    'Versions, notes and approvals for audio, video and pictures': 'Εκδοχές, σημειώσεις και εγκρίσεις για ήχο, βίντεο και φωτογραφίες',
    'Level matching for mixes, frame-accurate notes for picture': 'Ίδια ένταση για τις μίξεις, σημειώσεις στο καρέ για την εικόνα',
    'Finals: one branded link, Download all as .zip, credits and lyrics': 'Finals: ένα link με το όνομά σου, Download all σε .zip, συντελεστές και στίχοι',
    'Playlists, folders, people with roles': 'Playlists, φάκελοι, άνθρωποι με ρόλους', 'Your projects, stored safely in Europe': 'Τα projects σου, αποθηκευμένα με ασφάλεια στην Ευρώπη',
    'Stored safely, with your Roar account': 'Αποθηκευμένα με ασφάλεια, με το Roar Account σου', 'About': 'Σχετικά',
    'Something went wrong': 'Κάτι πήγε στραβά', 'Try again': 'Δοκίμασε ξανά', 'Close': 'Κλείσιμο', 'Cancel': 'Άκυρο', 'Save': 'Αποθήκευση', 'Saved': 'Αποθηκεύτηκε',
    'Delete': 'Διαγραφή', 'Remove': 'Αφαίρεση', 'Rename': 'Μετονομασία', 'Create': 'Δημιουργία', 'Add': 'Προσθήκη', 'Added': 'Προστέθηκε', 'Done': 'Έτοιμο', 'Next': 'Επόμενο', 'Previous': 'Προηγούμενο',
    'Open': 'Άνοιγμα', 'More': 'Περισσότερα', 'Continue': 'Συνέχεια', 'Copied': 'Αντιγράφηκε', 'Link copied': 'Το link αντιγράφηκε', 'Copy': 'Αντιγραφή', 'Copy link': 'Αντιγραφή link', 'Edit': 'Επεξεργασία',
    'Moved': 'Μετακινήθηκε', 'Move up': 'Πάνω', 'Move down': 'Κάτω', 'Undo': 'Αναίρεση', 'Clear': 'Καθάρισμα', 'Leave': 'Αποχώρηση', 'Never': 'Ποτέ', 'New': 'Νέο', 'Upload': 'Ανέβασμα', 'Uploads': 'Ανεβάσματα',
    'Could not copy: select the link and copy it': 'Δεν αντιγράφηκε: διάλεξε το link και αντέγραψέ το', 'just now': 'μόλις τώρα', 'Yours': 'Δικό σου', 'Shared with you': 'Κοινό μαζί σου',
    // projects
    'New project': 'Νέο project', 'Start your first project': 'Ξεκίνα το πρώτο σου project', 'Night Ferry (single)': 'Night Ferry (single)', 'Artist': 'Καλλιτέχνης', 'Title': 'Τίτλος', 'Who it is for': 'Για ποιον είναι',
    'A project is an album, a single or a film score. Put tracks in it, upload versions, and invite the people you work with.': 'Ένα project είναι ένας δίσκος, ένα single ή μια μουσική για ταινία. Βάλε μέσα τα αρχεία, ανέβασε εκδοχές και κάλεσε όσους δουλεύεις μαζί.',
    'Your workspace for sound, video and pictures: upload every version, collect notes on the exact second or spot, approve, and deliver the finals in one link.': 'Ο χώρος σου για ήχο, βίντεο και φωτογραφίες: ανεβάζεις κάθε εκδοχή, μαζεύεις σημειώσεις στο ακριβές δευτερόλεπτο ή σημείο, εγκρίνεις, και παραδίδεις τα τελικά σε ένα link.',
    'Big tiles': 'Μεγάλα πλακίδια', 'Small tiles': 'Μικρά πλακίδια', 'List': 'Λίστα', 'Delete this project?': 'Διαγραφή αυτού του project;', 'Project deleted': 'Το project διαγράφηκε',
    'Project cover': 'Εξώφυλλο project', 'Cover saved': 'Το εξώφυλλο αποθηκεύτηκε', 'Choose a photo': 'Διάλεξε φωτογραφία', 'Choose photo': 'Διάλεξε φωτογραφία', 'Turn': 'Περιστροφή',
    'JPG, PNG, WebP or HEIC from your phone': 'JPG, PNG, WebP ή HEIC από το κινητό σου', 'Drag the photo to move it, pinch or scroll to zoom.': 'Σύρε τη φωτογραφία για να τη μετακινήσεις, τσίμπημα ή ρόδα για ζουμ.',
    'Share': 'Κοινοποίηση', 'People': 'Άνθρωποι', 'Delivery': 'Παράδοση', 'Finals': 'Finals', 'All': 'Όλα', 'Audio': 'Ήχος', 'Video': 'Βίντεο', 'Pictures': 'Φωτογραφίες', 'Picture': 'Φωτογραφία',
    'Create a new item': 'Νέο στοιχείο', 'New file': 'Νέο αρχείο', 'New folder': 'Νέος φάκελος', 'New playlist': 'Νέα playlist', 'Upload a file': 'Ανέβασε αρχείο', 'Audio, video or a picture': 'Ήχος, βίντεο ή φωτογραφία',
    'Keep files together': 'Κράτα αρχεία μαζί', 'Audio or video, in order': 'Ήχος ή βίντεο, με σειρά', 'Rename folder': 'Μετονομασία φακέλου', 'Rename playlist': 'Μετονομασία playlist', 'An empty playlist': 'Μια άδεια playlist',
    'Every song and video of this project is already in it. Upload more to the project first.': 'Όλα τα τραγούδια και τα βίντεο του project είναι ήδη μέσα. Ανέβασε πρώτα κι άλλα στο project.',
    'Nothing here yet': 'Τίποτα ακόμα εδώ', 'When someone uploads a file it shows up here.': 'Όταν κάποιος ανεβάσει αρχείο, εμφανίζεται εδώ.',
    'Audio, video or pictures, up to 20 GB each. Each file gets its own page, with versions and notes.': 'Ήχος, βίντεο ή φωτογραφίες, έως 20 GB το καθένα. Κάθε αρχείο έχει τη δική του σελίδα, με εκδοχές και σημειώσεις.',
    'Drop more files here': 'Ρίξε κι άλλα αρχεία εδώ', 'Drop files here': 'Ρίξε αρχεία εδώ', 'Reading the sound…': 'Διαβάζω τον ήχο…', 'Starting…': 'Ξεκινάει…', 'Uploading…': 'Ανεβαίνει…', 'Finishing…': 'Ολοκληρώνεται…', 'Done': 'Έτοιμο',
    'Picked': 'Επιλεγμένα', 'Copy names for Lightroom': 'Αντιγραφή ονομάτων για Lightroom', 'Pick': 'Επιλογή', 'Pick this picture': 'Διάλεξε αυτή τη φωτογραφία',
    'Add someone with a Roar account': 'Πρόσθεσε κάποιον με Roar Account', 'their@email.com': 'το@email.του', 'Role': 'Ρόλος', 'Role changed': 'Ο ρόλος άλλαξε',
    'Can upload and edit': 'Ανεβάζει και αλλάζει', 'Can listen and comment': 'Ακούει και σχολιάζει', 'Can listen': 'Ακούει', 'Owner': 'Ιδιοκτήτης',
    'No account? Send them a share link instead, or ask them to make a free Roar account.': 'Δεν έχει λογαριασμό; Στείλε του ένα link, ή ζήτα του να φτιάξει δωρεάν Roar Account.',
    // the share window
    'Make the link': 'Φτιάξε το link', 'Ends': 'Λήγει', '1 day': '1 μέρα', '7 days': '7 μέρες', '30 days': '30 μέρες', 'Password (optional)': 'Κωδικός (προαιρετικά)',
    'They can leave notes on the waveform': 'Μπορούν να αφήνουν σημειώσεις', 'They can approve a version': 'Μπορούν να εγκρίνουν μια εκδοχή', 'They can download the files': 'Μπορούν να κατεβάσουν τα αρχεία',
    'Delete link': 'Διαγραφή link', 'Links made': 'Links που έφτιαξες', 'This link has a password': 'Αυτό το link έχει κωδικό', 'Ask the person who sent it for a new link.': 'Ζήτα νέο link από αυτόν που το έστειλε.',
    'Share the Finals': 'Κοινοποίηση των Finals', 'Share this file': 'Κοινοποίηση του αρχείου', 'Share the project': 'Κοινοποίηση του project',
    // a file's page
    'Back to the project': 'Πίσω στο project', 'Back to the start': 'Στην αρχή', 'Back 10 seconds': '10 δευτερόλεπτα πίσω', 'Play': 'Αναπαραγωγή', 'Pause': 'Παύση', 'Speed': 'Ταχύτητα', 'Loop': 'Επανάληψη',
    'Picture in picture': 'Εικόνα σε εικόνα', 'Full screen': 'Πλήρης οθόνη', 'Zoom': 'Ζουμ', 'Zoom in': 'Μεγέθυνση', 'Zoom out': 'Σμίκρυνση', 'Zoom the waveform (double-click for all of it)': 'Ζουμ στην κυματομορφή (διπλό κλικ για όλη)',
    'Level match': 'Ίδια ένταση', 'Levels': 'Στάθμες', 'New version': 'Νέα εκδοχή', 'Version': 'Εκδοχή', 'This version': 'Αυτή η εκδοχή', 'Versions': 'Εκδοχές',
    'Approve': 'Έγκριση', 'Approved': 'Εγκρίθηκε', '✓ Approved': '✓ Εγκρίθηκε', 'Undo approval': 'Αναίρεση έγκρισης', 'Make it final': 'Κάν’ το τελικό', 'Final': 'Τελικό', '★ Final': '★ Τελικό', 'In Finals': 'Στα Finals',
    'Take it out of Finals': 'Βγάλ’ το από τα Finals', 'Take it out of Finals?': 'Να βγει από τα Finals;', 'Take out': 'Βγάλ’ το', 'Download': 'Λήψη', 'Download all (.zip)': 'Λήψη όλων (.zip)',
    'Delete note': 'Διαγραφή σημείωσης', 'Version deleted': 'Η εκδοχή διαγράφηκε', 'Delete track': 'Διαγραφή αρχείου', 'Move to a folder': 'Μετακίνηση σε φάκελο', 'Top of the project': 'Στην αρχή του project', 'New folder…': 'Νέος φάκελος…',
    'This track has no versions yet.': 'Αυτό το αρχείο δεν έχει ακόμα εκδοχές.', 'This track is no longer here.': 'Αυτό το αρχείο δεν υπάρχει πια εδώ.',
    'This file could not be played in the browser. Download it instead.': 'Αυτό το αρχείο δεν παίζει στον browser. Κατέβασέ το.', 'This picture cannot be opened here. Try a JPG or PNG.': 'Η φωτογραφία δεν ανοίγει εδώ. Δοκίμασε JPG ή PNG.',
    // notes
    'Notes': 'Σημειώσεις', 'Notepad': 'Σημειωματάριο', 'Stills': 'Καρέ', 'Post': 'Αποστολή', 'Reply': 'Απάντηση', 'Search notes': 'Αναζήτηση', 'Open': 'Ανοιχτές', 'Mine': 'Δικές μου',
    'No notes on this version yet. Play it, pause where something needs work and write below.': 'Καμία σημείωση ακόμα. Παίξ’ το, σταμάτα εκεί που θέλει δουλειά και γράψε από κάτω.',
    'No notes on this version yet.': 'Καμία σημείωση ακόμα.', 'No notes match.': 'Καμία σημείωση δεν ταιριάζει.', 'at': 'στο',
    'A note over a stretch': 'Σημείωση σε διάστημα', 'A note over a stretch: press at the start, press again at the end (or Shift and drag on the waveform)': 'Σημείωση σε διάστημα: πάτα στην αρχή και ξανά στο τέλος (ή Shift και σύρε στην κυματομορφή)',
    'Speak a note': 'Φωνητική σημείωση', 'Hold to speak a note, or click to start and click to stop': 'Κράτα πατημένο για να μιλήσεις, ή πάτα για αρχή και ξανά για τέλος', 'Spoken note': 'Φωνητική σημείωση', 'Spoken note posted': 'Η φωνητική σημείωση στάλθηκε',
    'Sending the spoken note…': 'Στέλνεται η φωνητική σημείωση…', 'Too short: hold the microphone while you speak': 'Πολύ σύντομο: κράτα το μικρόφωνο όσο μιλάς', 'The microphone is not allowed in this browser': 'Το μικρόφωνο δεν επιτρέπεται σε αυτόν τον browser', 'This browser cannot record sound': 'Αυτός ο browser δεν μπορεί να ηχογραφήσει',
    'Drawing goes with this note': 'Η ζωγραφιά πάει με αυτή τη σημείωση', 'Remove the drawing': 'Αφαίρεση ζωγραφιάς', 'On the spot you clicked': 'Στο σημείο που πάτησες', 'No spot': 'Χωρίς σημείο',
    'No stills yet. Pause on a frame and press Grab still.': 'Κανένα καρέ ακόμα. Σταμάτα σε ένα καρέ και πάτα Grab still.', 'Download this still': 'Λήψη του καρέ', 'Delete this still': 'Διαγραφή του καρέ',
    'Grab still': 'Grab still', 'Save this frame as a picture, with its time on it': 'Σώσε αυτό το καρέ ως εικόνα, με τον χρόνο του πάνω', 'Play the video once, then grab': 'Παίξε μία φορά το βίντεο και μετά πάρε το καρέ',
    'This video does not allow a still here': 'Αυτό το βίντεο δεν επιτρέπει καρέ εδώ', 'Could not save the still': 'Το καρέ δεν σώθηκε',
    'Only you see this notepad. Lists, ideas, what to fix next…': 'Μόνο εσύ βλέπεις αυτό το σημειωματάριο.', 'Saving…': 'Αποθηκεύεται…', 'Could not save': 'Δεν αποθηκεύτηκε',
    // video tools
    'One frame back': 'Ένα καρέ πίσω', 'One frame back (←)': 'Ένα καρέ πίσω (←)', 'One frame on': 'Ένα καρέ μπροστά', 'One frame on (→)': 'Ένα καρέ μπροστά (→)',
    'Frame masks': 'Μάσκες κάδρου', 'Frame masks: 2.39, 1.85, 9:16, 4:5, safe areas': 'Μάσκες κάδρου: 2.39, 1.85, 9:16, 4:5, safe areas', 'None': 'Καμία', 'Safe areas': 'Safe areas',
    'Draw on the frame': 'Ζωγράφισε πάνω στο καρέ', 'Draw on the frame, then write the note': 'Ζωγράφισε πάνω στο καρέ και μετά γράψε τη σημείωση', 'Circle': 'Κύκλος', 'Arrow': 'Βέλος', 'Pen': 'Μολύβι',
    'Compare two versions': 'Σύγκριση δύο εκδοχών', 'Two versions side by side': 'Δύο εκδοχές δίπλα δίπλα', 'Pick the version on the right': 'Διάλεξε την εκδοχή δεξιά',
    'Notes as markers for the edit': 'Οι σημειώσεις ως markers για το μοντάζ', 'Notes as markers for the edit (Resolve, Premiere)': 'Οι σημειώσεις ως markers για το μοντάζ (Resolve, Premiere)', 'Markers for the edit': 'Markers για το μοντάζ',
    'No notes with a time on this version yet': 'Δεν υπάρχουν ακόμα σημειώσεις με χρόνο', 'DaVinci Resolve (.edl)': 'DaVinci Resolve (.edl)', 'Premiere Pro (.xml)': 'Premiere Pro (.xml)', 'Spreadsheet (.csv)': 'Υπολογιστικό φύλλο (.csv)',
    // sound tools
    'A/B: Space switches between two versions at the same point': 'A/B: το Space αλλάζει εκδοχή στο ίδιο σημείο', 'How Spotify, Apple Music and YouTube will play it': 'Πώς θα το παίξουν Spotify, Apple Music και YouTube', 'Streaming': 'Streaming',
    'Stems': 'Stems', 'The parts of this version, with mute and solo': 'Τα κομμάτια αυτής της εκδοχής, με mute και solo', 'Add stems': 'Πρόσθεσε stems', 'Play the stems': 'Αναπαραγωγή των stems', 'Mute': 'Σίγαση', 'Solo': 'Solo',
    'Delete this stem?': 'Διαγραφή αυτού του stem;', 'It leaves the version for everyone.': 'Φεύγει από την εκδοχή για όλους.',
    'Streaming check': 'Έλεγχος για streaming', 'Measuring the true peak…': 'Μετριέται το true peak…', 'Loudness': 'Ένταση', 'True peak': 'True peak', 'This version has no loudness reading yet.': 'Αυτή η εκδοχή δεν έχει ακόμα μέτρηση έντασης.',
    'Plays as it is': 'Παίζει όπως είναι', 'Plays as it is (no room to turn it up)': 'Παίζει όπως είναι (δεν χωράει να δυναμώσει)',
    'Each service turns songs to its own loudness. Apple Music and Spotify may turn a quiet song up only as far as its peak allows; YouTube, Tidal and Amazon only turn loud songs down.': 'Κάθε υπηρεσία φέρνει τα τραγούδια στη δική της ένταση. Apple Music και Spotify δυναμώνουν ένα σιγανό τραγούδι μόνο όσο επιτρέπει το peak του· YouTube, Tidal και Amazon μόνο χαμηλώνουν τα δυνατά.',
    // the analyzer
    'Analyzer': 'Αναλυτής', 'Spectrum': 'Φάσμα', 'Scopes': 'Scopes', 'what frequencies are playing, live': 'ποιες συχνότητες παίζουν, ζωντανά', 'brightness and colour of the frame on screen': 'φωτεινότητα και χρώμα του καρέ στην οθόνη',
    'brightness and colour of the picture': 'φωτεινότητα και χρώμα της φωτογραφίας', 'Press play to see the spectrum': 'Πάτα play για να δεις το φάσμα', 'Waveform': 'Waveform', 'RGB parade': 'RGB parade', 'Vectorscope': 'Vectorscope', 'Histogram': 'Ιστόγραμμα',
    'Waveform (brightness)': 'Waveform (φωτεινότητα)', 'Show or hide the analyzer': 'Εμφάνιση ή απόκρυψη του αναλυτή', 'This file does not allow scopes here.': 'Αυτό το αρχείο δεν επιτρέπει scopes εδώ.',
    // pictures
    'Before / after': 'Πριν / μετά', '100%': '100%', 'See the picture at 100% under the pointer': 'Δες τη φωτογραφία στο 100% κάτω από τον δείκτη', 'Click the picture to put a note on that spot': 'Πάτα πάνω στη φωτογραφία για σημείωση σε εκείνο το σημείο',
    // tips
    'Hide this tip': 'Κρύψε τη συμβουλή', 'A stretch': 'Διάστημα',
    // finals and credits
    'Final files': 'Τελικά αρχεία', 'Credits': 'Συντελεστές', 'Save credits': 'Αποθήκευση συντελεστών', 'Credits saved': 'Οι συντελεστές αποθηκεύτηκαν', 'Template': 'Πρότυπο', 'Lyrics': 'Στίχοι', 'Add credits': 'Πρόσθεσε συντελεστές',
    'Music': 'Μουσική', 'Photo': 'Φωτογραφία', 'Custom': 'Δικό σου', 'Remove line': 'Αφαίρεση γραμμής', 'Add a line': 'Πρόσθεσε γραμμή',
    'The words of the song, as you want them shown': 'Οι στίχοι του τραγουδιού, όπως θέλεις να φαίνονται', 'Thanks, links, anything else': 'Ευχαριστίες, links, ό,τι άλλο',
    'Put who made it next to the files: a music, video or photo template, lyrics and notes. Everyone with the Finals link sees them.': 'Βάλε ποιοι το έφτιαξαν δίπλα στα αρχεία: πρότυπο για μουσική, βίντεο ή φωτογραφία, στίχοι και σημειώσεις. Τα βλέπουν όλοι με το link των Finals.',
    'No final files yet': 'Κανένα τελικό αρχείο ακόμα', 'Zip ready': 'Το zip είναι έτοιμο', 'Too big for one zip here: downloading one by one': 'Πολύ μεγάλο για ένα zip εδώ: κατεβαίνουν ένα ένα', 'View': 'Προβολή',
    // settings
    'Your studio, your defaults and your emails': 'Το στούντιό σου, οι προεπιλογές σου και τα email σου', 'Your studio': 'Το στούντιό σου', 'Studio name': 'Όνομα στούντιο', 'Square logo': 'Τετράγωνο λογότυπο', 'Wide banner': 'Φαρδύ banner',
    'Background of your pages': 'Φόντο των σελίδων σου', 'Shown at the top of every page you send: links, playlists and Finals.': 'Φαίνεται πάνω σε κάθε σελίδα που στέλνεις: links, playlists και Finals.',
    'Shown softly behind your Finals, playlists and links, under the glass.': 'Φαίνεται απαλά πίσω από τα Finals, τις playlists και τα links σου, κάτω από το γυαλί.',
    'Remove logo': 'Αφαίρεση λογότυπου', 'Remove banner': 'Αφαίρεση banner', 'Remove background': 'Αφαίρεση φόντου', 'Choose the logo': 'Διάλεξε λογότυπο', 'Choose the banner': 'Διάλεξε banner', 'Choose the background': 'Διάλεξε φόντο',
    'Defaults': 'Προεπιλογές', 'What new invitations and links start with. You can change each one when you make it.': 'Με τι ξεκινάνε οι νέες προσκλήσεις και τα links. Αλλάζεις το καθένα όταν το φτιάχνεις.',
    'Invitations': 'Προσκλήσεις', 'The role someone gets when you add them': 'Ο ρόλος που παίρνει κάποιος όταν τον προσθέτεις', 'Links: comments': 'Links: σχόλια', 'People with a link can leave notes': 'Όσοι έχουν link αφήνουν σημειώσεις',
    'Links: approve': 'Links: έγκριση', 'People with a link can approve a version': 'Όσοι έχουν link εγκρίνουν εκδοχή', 'Links: download': 'Links: λήψη', 'People with a link can download the files': 'Όσοι έχουν link κατεβάζουν τα αρχεία',
    'Hide version numbers': 'Κρύψε τους αριθμούς εκδοχών', 'People on your links see a version’s name or date, never v1, v2…': 'Όσοι έχουν link βλέπουν όνομα ή ημερομηνία, ποτέ v1, v2…',
    'Watermark on links': 'Υδατογράφημα στα links', 'Your studio’s name over pictures seen through review links; Finals stay clean': 'Το όνομα του στούντιό σου πάνω στις φωτογραφίες των links ελέγχου· τα Finals μένουν καθαρά',
    'Emails': 'Email', 'Uploads': 'Ανεβάσματα', 'Upload naming': 'Όνομα στο ανέβασμα', 'Look': 'Εμφάνιση', 'Theme': 'Θέμα', 'Kept on this device': 'Μένει σε αυτή τη συσκευή', 'Dark': 'Σκοτεινό', 'Light': 'Φωτεινό', 'System': 'Συστήματος',
    'Background': 'Φόντο', 'Waves': 'Κύματα', 'Fibre': 'Ίνες', 'Studio': 'Στούντιο', 'Desk': 'Γραφείο', 'Language': 'Γλώσσα', 'English': 'English', 'Ελληνικά': 'Ελληνικά',
    'Your name, picture, password and two-step verification live in your Roar account, the same for every Roar app.': 'Το όνομα, η φωτογραφία, ο κωδικός και η επαλήθευση δύο βημάτων είναι στο Roar Account σου, ίδια για κάθε Roar εφαρμογή.',
    'Notes': 'Σημειώσεις', 'New versions': 'Νέες εκδοχές', 'Approvals': 'Εγκρίσεις', 'Shared with me': 'Κοινά μαζί μου', 'Daily digest': 'Μία φορά τη μέρα',
    // storage, admin
    'Unlimited while RoarTransfer Studio is new. Files shared with you count for their owner.': 'Απεριόριστο όσο το RoarTransfer Studio είναι καινούργιο. Τα αρχεία που μοιράζονται μαζί σου μετράνε στον ιδιοκτήτη τους.',
    'Biggest projects': 'Τα μεγαλύτερα projects', 'Accounts': 'Λογαριασμοί', 'Joined': 'Εγγραφή', 'Last active': 'Τελευταία δραστηριότητα', 'Last 30 days': 'Τελευταίες 30 μέρες', 'Uploads and notes per day': 'Ανεβάσματα και σημειώσεις ανά μέρα', 'What they upload': 'Τι ανεβάζουν',
    // notifications
    'Nothing new': 'Τίποτα καινούργιο', 'Today': 'Σήμερα', 'Yesterday': 'Χθες', 'Downloads': 'Λήψεις', 'Comments': 'Σχόλια',
    'Notes, approvals, new versions and downloads by the people you work with show up here.': 'Εδώ εμφανίζονται σημειώσεις, εγκρίσεις, νέες εκδοχές και λήψεις από όσους δουλεύεις μαζί.',
    // link pages
    'Review and': 'Έλεγχος και', 'deliver': 'παράδοση', 'audio, video and pictures.': 'ήχου, βίντεο και φωτογραφιών.', 'Open the page again': 'Άνοιξε ξανά τη σελίδα', 'Stop and close': 'Σταμάτα και κλείσε', 'Open its page': 'Άνοιξε τη σελίδα του',
    'In review': 'Σε έλεγχο', 'Name': 'Όνομα', 'Name v': 'Όνομα v', 'Delete “': 'Διαγραφή “', 'Delete the folder “': 'Διαγραφή του φακέλου “', 'Delete v': 'Διαγραφή v', 'Reply to ': 'Απάντηση στον/στην ', 'The Mad Lions': 'The Mad Lions', 'RoarTransfer': 'RoarTransfer'
  }

  var plural = function (n, one, many) { return n + ' ' + (+n === 1 ? one : many) }
  var KW = { Audio: 'Ήχος', Video: 'Βίντεο', Picture: 'Φωτογραφία', Pictures: 'Φωτογραφίες' }
  var RULES = [
    [/^(Audio|Video|Picture|Pictures) · (.+)$/, function (m, k, r) { return KW[k] + ' · ' + r }],
    [/^(Audio|Video|Pictures) ([\d.]+ [KMGT]?B)$/, function (m, k, r) { return KW[k] + ' ' + r }],
    [/^(.+) \(you\)$/, function (m, a) { return a + ' (εσύ)' }],
    [/^peak (.+)$/, function (m, a) { return 'peak ' + a }],
    [/^(·\s)?(.+), just now$/, function (m, d, a) { return (d || '') + a + ', μόλις τώρα' }],
    [/^(·\s)?(.+), (\d+) min ago$/, function (m, d, a, n) { return (d || '') + a + ', πριν ' + n + ' λεπτά' }],
    [/^(·\s)?(.+), (\d+) h ago$/, function (m, d, a, n) { return (d || '') + a + ', πριν ' + n + ' ώρες' }],
    [/^True peak (.+)$/, function (m, a) { return 'True peak ' + a }],
    [/^in (\d+) projects?$/, function (m, n) { return 'σε ' + n + ' projects' }],
    [/^Sent to (.+), a few minutes after it happens, grouped together\.$/, function (m, a) { return 'Στέλνονται στο ' + a + ', λίγα λεπτά αφού γίνουν, μαζεμένα.' }],
    [/^(\d+) projects?$/, function (m, n) { return plural(n, 'project', 'projects') }],
    [/^(\d+) projects? · (.+) stored$/, function (m, n, st) { return plural(n, 'project', 'projects') + ' · ' + st + ' αποθηκευμένα' }],
    [/^(\d+) files?$/, function (m, n) { return plural(n, 'αρχείο', 'αρχεία') }],
    [/^(.+) · (\d+) files?$/, function (m, a, n) { return (EL[a] || a) + ' · ' + plural(n, 'αρχείο', 'αρχεία') }],
    [/^(\d+) versions?$/, function (m, n) { return plural(n, 'εκδοχή', 'εκδοχές') }],
    [/^(v\d+|[^·]+?) · (\d+) versions?(?: · (\d+) open notes?)?$/, function (m, v, n, o) { return v + ' · ' + plural(n, 'εκδοχή', 'εκδοχές') + (o ? ' · ' + plural(o, 'ανοιχτή σημείωση', 'ανοιχτές σημειώσεις') : '') }],
    [/^(\d+) open · (\d+) in all$/, function (m, a, b) { return a + ' ανοιχτές · ' + b + ' συνολικά' }],
    [/^(\d+) min ago$/, function (m, n) { return 'πριν ' + n + ' λεπτά' }],
    [/^(\d+) h ago$/, function (m, n) { return 'πριν ' + n + ' ώρες' }],
    [/^(\d+) d ago$/, function (m, n) { return 'πριν ' + n + ' μέρες' }],
    [/^(\d+) days? ago$/, function (m, n) { return 'πριν ' + n + ' μέρες' }],
    [/^(.+) is waiting for approval$/, function (m, v) { return 'Η ' + v + ' περιμένει έγκριση' }],
    [/^Approve (.+)$/, function (m, v) { return 'Έγκριση ' + v }],
    [/^ · by (.+)$/, function (m, a) { return ' · από ' + a }],
    [/^(.+) · by (.+) · (.+)$/, function (m, a, b, c) { return a + ' · από ' + b + ' · ' + c }],
    [/^Turned down ([\d.]+) dB$/, function (m, n) { return 'Χαμηλώνει ' + n + ' dB' }],
    [/^Turned up ([\d.]+) dB$/, function (m, n) { return 'Δυναμώνει ' + n + ' dB' }],
    [/^Turned up ([\d.]+) dB \(held back by the peak\)$/, function (m, n) { return 'Δυναμώνει ' + n + ' dB (το κρατάει το peak)' }],
    [/^Plays as it is, ([\d.]+) dB quieter than the rest$/, function (m, n) { return 'Παίζει όπως είναι, ' + n + ' dB πιο σιγανά από τα άλλα' }],
    [/^Still saved in Stills · (.+)$/, function (m, t) { return 'Το καρέ σώθηκε στα Καρέ · ' + t }],
    [/^(\d+) notes? at (.+), timeline starting at 01:00:00:00\.$/, function (m, n, f) { return plural(n, 'σημείωση', 'σημειώσεις') + ' στα ' + f + ', με το timeline να ξεκινάει στο 01:00:00:00.' }],
    [/^(\d+) names? copied: paste them in Lightroom, Library Filter > Text > Filename > Contains$/, function (m, n) { return plural(n, 'όνομα αντιγράφηκε', 'ονόματα αντιγράφηκαν') + ': επικόλλησέ τα στο Lightroom, Library Filter > Text > Filename > Contains' }],
    [/^Picked by (.+)$/, function (m, a) { return 'Το διάλεξαν: ' + a }],
    [/^Before · (.+)$/, function (m, v) { return 'Πριν · ' + v }],
    [/^After · (.+)$/, function (m, v) { return 'Μετά · ' + v }],
    [/^A\/B on · Space goes (.+) at the same point$/, function (m, s) { return 'A/B ανοιχτό · το Space πάει ' + s + ' στο ίδιο σημείο' }],
    [/^Final files from (.+)$/, function (m, a) { return 'Τελικά αρχεία από ' + a }],
    [/^Play from (.+)$/, function (m, a) { return 'Αναπαραγωγή από ' + a }],
    [/^Note at (.+?)(?: by (.+))?$/, function (m, a, b) { return 'Σημείωση στο ' + a + (b ? ' από ' + b : '') }],
    [/^black ([\d.]+)%$/, function (m, a) { return 'μαύρα ' + a + '%' }],
    [/^white ([\d.]+)%$/, function (m, a) { return 'λευκά ' + a + '%' }],
    [/^Delete (.+)$/, function (m, a) { return 'Διαγραφή ' + a }],
    [/^Open (.+)$/, function (m, a) { return 'Άνοιγμα ' + a }],
    [/^Play (.+)$/, function (m, a) { return 'Αναπαραγωγή ' + a }],
    [/^Level of (.+)$/, function (m, a) { return 'Στάθμη του ' + a }],
    [/^(.+) left a note on$/, function (m, a) { return a + ' άφησε σημείωση στο' }],
    [/^ left a note on (.+)$/, function (m, a) { return ' άφησε σημείωση στο ' + a }],
    [/^ approved (.+)$/, function (m, a) { return ' ενέκρινε το ' + a }],
    [/^ downloaded (.+)$/, function (m, a) { return ' κατέβασε το ' + a }],
    [/^ uploaded a new version of (.+)$/, function (m, a) { return ' ανέβασε νέα εκδοχή του ' + a }],
    [/^ added you to (.+)$/, function (m, a) { return ' σε πρόσθεσε στο ' + a }],
    [/^(.+) is $/, function (m, a) { return a + ' είναι ' }]
  ]
  var FRAG = {
    ' · press A/B at the top, then ': ' · πάτα A/B πάνω και μετά ', ': you hear the next version (A → B → C) from the same second, without stopping.': ': ακούς την επόμενη εκδοχή (A → B → C) από το ίδιο δευτερόλεπτο, χωρίς να σταματήσει.',
    ' · hold ': ' · κράτα ', ' and drag on the waveform to pick a part (0:42 to 0:58): the note you write covers all of it.': ' και σύρε στην κυματομορφή για να διαλέξεις ένα κομμάτι (0:42 έως 0:58): η σημείωση πιάνει όλο το κομμάτι.',
    'This week your links were opened ': 'Αυτή την εβδομάδα τα links σου άνοιξαν ', ' time and played ': ' φορά και έπαιξαν ', ' times and played ': ' φορές και έπαιξαν ', ' time.': ' φορά.', ' times.': ' φορές.',
    ' · over −1 dBTP: it can distort when it is encoded for streaming. Lower the limiter ceiling to −1.': ' · πάνω από −1 dBTP: μπορεί να παραμορφώσει όταν κωδικοποιηθεί για streaming. Κατέβασε το ταβάνι του limiter στο −1.',
    ' · safe for encoding (−1 dBTP or lower).': ' · ασφαλές για κωδικοποίηση (−1 dBTP ή χαμηλότερα).', ' is ': ' είναι ', 'final': 'τελικό'
  }

  function tr(text) {
    var k = text.trim(); if (!k || !/[A-Za-z]/.test(k)) return null
    var v = EL[k]
    if (v == null && FRAG[text] != null) return FRAG[text]
    if (v == null) for (var i = 0; i < RULES.length; i++) { var m = k.match(RULES[i][0]); if (m) { v = RULES[i][1].apply(null, m); break } }
    if (v == null) return null
    return text.replace(k, v)
  }
  var SKIP = 'script,style,textarea,[data-notr],.body,.lyrics,.crow b,.cnotes,.acrow q,.nm b,h1,.who b,.pinfo b,.sc-row b,.stem .nm,.trk .nm b'
  function walk(root) {
    if (!root) return
    if (root.nodeType === 3) { fixText(root); return }
    if (root.nodeType !== 1) return
    if (root.closest && root.closest('script,style,textarea,[data-notr]')) return
    fixAttrs(root)
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null), n
    while ((n = tw.nextNode())) { if (n.nodeType === 3) fixText(n); else fixAttrs(n) }
  }
  function fixText(n) {
    var p = n.parentElement; if (!p || p.closest(SKIP) && !p.closest('.notr-ok')) { if (!(p && p.closest && p.closest('h1') && EL[n.nodeValue.trim()])) return }
    var v = tr(n.nodeValue); if (v != null && v !== n.nodeValue) n.nodeValue = v
  }
  function fixAttrs(el) {
    if (el.closest && el.closest('[data-notr]')) return
    ;['placeholder', 'title', 'aria-label'].forEach(function (a) { var x = el.getAttribute && el.getAttribute(a); if (x) { var v = tr(x); if (v != null && v !== x) el.setAttribute(a, v) } })
  }
  var queued = [], timer = 0
  function flush() { timer = 0; var q = queued; queued = []; obs.disconnect(); q.forEach(function (n) { try { walk(n) } catch (e) {} }); obs.observe(document.body, OPTS) }
  var OPTS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] }
  var obs = new MutationObserver(function (list) {
    list.forEach(function (m) { if (m.type === 'childList') m.addedNodes.forEach(function (x) { queued.push(x) }); else queued.push(m.target) })
    if (!timer) timer = requestAnimationFrame(flush)
  })
  var start = function () { try { walk(document.body) } catch (e) {} obs.observe(document.body, OPTS) }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start)
  window.RSLang.tr = tr
})()
