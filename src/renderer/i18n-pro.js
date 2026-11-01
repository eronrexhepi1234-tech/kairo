// English for the newer parts of Kairo (Pro Studio, Builder, Roblox, Stream Deck, tidy mode, Jarvis, studio).
// Those parts are written in German; when Kairo is set to another language, this layer swaps their UI texts
// to English as they appear on screen. Only whole texts that match exactly are swapped – chat messages,
// AI answers and anything the user typed are never touched.
(function () {
  const EN = {
    // ---------- general ----------
    'Das hat nicht geklappt': 'That did not work', 'Hat nicht geklappt': 'That did not work', 'Nochmal': 'Try again', '{0} Öffnen': '{0} Open', 'Öffnen': 'Open', '{0} Ordner': '{0} Folder',
    'Exportiere…': 'Exporting…', 'Lädt…': 'Loading…', 'Fertig': 'Done', 'Erledigt': 'Done', 'Abbrechen': 'Cancel', 'Beenden': 'End', 'Hinzufügen': 'Add', '{0} Hinzufügen': '{0} Add',
    '{0} Bearbeiten': '{0} Edit', '{0} Ändern': '{0} Change', 'Gespeichert': 'Saved', 'Text kopiert': 'Text copied', 'Prompt kopiert': 'Prompt copied', 'Zeile': 'line', 'Zeilen': 'lines',
    'Kein KI-Schlüssel – trag ihn in Einstellungen → KI ein.': 'No AI key – add it in Settings → AI.', 'Kein KI-Schlüssel gefunden – trag ihn in Einstellungen → KI ein.': 'No AI key found – add it in Settings → AI.',
    'Die KI ist gerade überlastet – in einer Minute nochmal versuchen.': 'The AI is busy right now – try again in a minute.', 'Version': 'Version', 'Gebaut': 'Built', 'Geladen': 'Loaded',
    'Dokumente': 'Documents', 'Schulaufsatz': 'School essay', 'Primarschule': 'Primary school', 'Sekundarstufe 1': 'Lower secondary', 'Gymnasium': 'High school', 'Mathe': 'Maths', 'Mathematik': 'Mathematics', 'Geschichte': 'History', 'Geografie': 'Geography', 'Geographie': 'Geography',
    'Biologie': 'Biology', 'Chemie': 'Chemistry', 'Physik': 'Physics', 'Informatik': 'Computer science', 'Wirtschaft': 'Economics', 'Musik': 'Music', 'Ethik': 'Ethics', 'Latein': 'Latin', 'Marken': 'Brands', 'Werte & Ton': 'Values & tone', 'Ton:': 'Tone:', 'Einsatz': 'Use', 'Lernpfad:': 'Learning path:', 'Marke:': 'Brand:',
    'Entwurf': 'Design', '· ausgewählt:': '· selected:', 'Prompt für {0}': 'Prompt for {0}', 'KI-Antwort': 'AI answer', 'Überschriften': 'Headings', 'Erklärung:': 'Explanation:', 'Projekt:': 'Project:', 'Übungsprüfung:': 'Practice exam:',
    '– z. B. „Wie funktioniert der Login?“, „Wo ist der Fehler bei …?“ oder „Wie baue ich Feature X ein?“': '– e.g. “How does the login work?”, “Where is the bug in …?” or “How do I add feature X?”',
    'z. B. Wie wird KI die Arbeitswelt bis 2035 verändern?': 'e.g. How will AI change work by 2035?',
    'Beschreib dein Dashboard, z. B. „Ethereum in Franken, Wetter in Tirana und Dollar zu Franken“': 'Describe your dashboard, e.g. “Ethereum in dollars, weather in Tokyo and euro to dollar”', 'Dein Ziel, z. B. Einen YouTube-Kanal mit 1000 Abos aufbauen': 'Your goal, e.g. grow a YouTube channel to 1000 subscribers',
    'Thema, z. B. Die Geschichte von Apple': 'Topic, e.g. the history of Apple', 'Thema, z. B. Klimawandel in den Alpen': 'Topic, e.g. climate change in the mountains', 'z. B. Gaming-Kanal „NovaPlays“, Farben Lila und Neon': 'e.g. gaming channel “NovaPlays”, purple and neon colours',
    'z. B. eine App, die Fussball-Trainings plant': 'e.g. an app that plans football training', 'z. B. eine mittelalterliche Burg mit 4 Türmen': 'e.g. a medieval castle with 4 towers',
    // ---------- Pro Studio: navigation ----------
    'Pro Studio': 'Pro Studio', 'Recherche': 'Research', 'Deep Research': 'Deep Research', 'Bericht mit Quellen': 'Report with sources', 'Quellen-Finder': 'Source finder', 'Zitate & Literatur': 'Citations & bibliography',
    'Schreiben': 'Writing', 'Profi-Dokumente': 'Pro documents', 'Bewerbung, CV, Bericht': 'Application, CV, report', 'Schreib-Coach': 'Writing coach', 'Text verbessern': 'Improve a text', 'Dokument-Übersetzer': 'Document translator', 'Word, PowerPoint, PDF': 'Word, PowerPoint, PDF',
    'Präsentation & Training': 'Presentation & training', 'Folien + Vortrag üben': 'Slides + practise your talk', 'Arbeiten': 'Work', 'Code-Assistent': 'Code assistant', 'Projekt verstehen': 'Understand a project', 'Dashboard': 'Dashboard', 'Live-Daten': 'Live data',
    'Projekt-Manager': 'Project manager', 'Ziele planen': 'Plan your goals', 'Lernen': 'Learning', 'Prüfungs-Simulator': 'Exam simulator', 'Mit Note & Plan': 'With grade & plan', 'Sprachlehrer': 'Language tutor', 'Gespräch üben': 'Practise talking', 'Lernpfad': 'Learning path', 'Tag für Tag': 'Day by day',
    'Marken-Kit': 'Brand kit', 'Logo, Farben, Fonts': 'Logo, colours, fonts', 'Agent-Modus': 'Agent mode', 'Erledigt ganze Aufgaben': 'Does whole tasks', 'Gedächtnis': 'Memory', 'Was Kairo weiss': 'What Kairo knows',
    // research
    'Kairo durchsucht das Web zu deiner Frage, liest dutzende Quellen und schreibt einen Bericht mit Zahlen, Diagramm und Quellenangaben.': 'Kairo searches the web for your question, reads dozens of sources and writes a report with numbers, a chart and citations.',
    'Schnell · 4 Teilfragen': 'Quick · 4 sub-questions', 'Gründlich · 7 Teilfragen': 'Thorough · 7 sub-questions', '{0} Recherchieren': '{0} Research', 'Recherchieren': 'Research',
    'Wie funktioniert die Energiewende in der Schweiz?': 'How will the world switch to clean energy?', 'Welche Smartphone-Marke ist 2026 am besten?': 'Which smartphone brand is best in 2026?', 'Warum ist Japan so sicher?': 'Why is Japan so safe?', 'Lohnt sich ein Elektroauto?': 'Is an electric car worth it?',
    'Frühere Recherchen': 'Earlier research', 'Deep Research läuft': 'Deep research running', 'Plane die Recherche…': 'Planning the research…', 'Recherche geplant · {0} Teilfragen': 'Research planned · {0} sub-questions', '{0} Quellen': '{0} sources', 'Quellen gelesen': 'sources read',
    'Schreibe den Bericht…': 'Writing the report…', 'Recherche-Bericht · {0}': 'Research report · {0}', '{0} Neue Recherche': '{0} New research', 'Fazit': 'Conclusion', 'Noch offen': 'Still open', 'Quellen ({0})': 'Sources ({0})',
    'Ohne Gemini gibt es keine Web-Quellen – der Bericht stammt dann aus dem Wissen der KI.': 'Without Gemini there are no web sources – the report then comes from the AI’s own knowledge.',
    // sources
    'Seriöse Quellen für Vorträge und Aufsätze – mit Vertrauens-Bewertung und fertigem Literaturverzeichnis.': 'Reliable sources for talks and essays – with a trust rating and a ready-made bibliography.',
    '{0} Quellen finden': '{0} Find sources', 'Suche seriöse Quellen…': 'Searching reliable sources…', '{0} Literaturverzeichnis kopieren': '{0} Copy bibliography', 'Literaturverzeichnis kopiert': 'Bibliography copied', 'Zitat kopiert': 'Citation copied',
    '{0} Als PDF': '{0} As PDF', '{0} Als Word': '{0} As Word', 'Literaturverzeichnis': 'Bibliography', 'Wofür welche Quelle?': 'Which source for what?', 'Quelle': 'Source', 'Art': 'Type', 'Nützlich für': 'Useful for', 'Quellen:': 'Sources:',
    // documents
    'Fertige Profi-Dokumente mit Design – als PDF und Word. Fehlende Angaben setzt Kairo als [Platzhalter], nichts wird erfunden.': 'Finished, designed documents – as PDF and Word. Missing details become [placeholders]; nothing is made up.',
    'Bewerbung': 'Application', 'Lebenslauf': 'CV', 'Bericht': 'Report', 'Anleitung': 'Guide', 'Formeller Brief': 'Formal letter', 'Protokoll': 'Minutes', 'Referat-Handout': 'Talk handout', 'Angebot': 'Offer',
    'Name, Stelle/Lehre, Firma, deine Stärken, Schule…': 'Name, job/apprenticeship, company, your strengths, school…', 'Name, Geburtsdatum, Schulen, Praktika, Sprachen, Hobbys…': 'Name, date of birth, schools, internships, languages, hobbies…',
    'Thema, Zweck, wichtigste Punkte, Ergebnisse…': 'Topic, purpose, key points, results…', 'Was soll erklärt werden, für wen…': 'What should be explained, for whom…', 'An wen, worum geht es, was willst du erreichen…': 'To whom, what about, what do you want to achieve…',
    'Sitzung, Teilnehmer, Themen, Entscheidungen…': 'Meeting, participants, topics, decisions…', 'Thema, Klasse, wichtigste Punkte…': 'Topic, class, key points…', 'Was bietest du an, für wen, Preise…': 'What do you offer, for whom, prices…',
    '{0} Deine Daten gehen nur an deine gewählte KI.': '{0} Your data only goes to the AI you chose.', '{0} Dokument erstellen': '{0} Create document', 'Schreib ein paar Angaben': 'Write a few details', 'Kairo schreibt dein Dokument…': 'Kairo is writing your document…', 'Noch besser machen': 'Make it even better',
    // writing coach
    'Kairo verbessert deinen Text und erklärt jede Änderung – so wirst du selbst besser.': 'Kairo improves your text and explains every change – so you get better yourself.', 'Füge hier deinen Text ein…': 'Paste your text here…',
    'Aufsatz': 'Essay', 'Bewerbung, professionell': 'Application, professional', 'E-Mail': 'Email', 'E-Mail, freundlich und klar': 'Email, friendly and clear', 'Social Media': 'Social media', 'Social Media, packend': 'Social media, catchy', 'Kurz & klar': 'Short & clear', 'kurz und klar': 'short and clear',
    '{0} Verbessern': '{0} Improve', 'Der Text ist zu kurz': 'The text is too short', 'Kairo liest deinen Text…': 'Kairo is reading your text…', 'Grammatik': 'Grammar', 'Stil': 'Style', 'Aufbau': 'Structure', 'Klarheit': 'Clarity',
    'Dein Text': 'Your text', 'Änderungen ({0})': 'Changes ({0})', 'Verbesserte Version': 'Improved version', '{0} Kopieren': '{0} Copy', 'Schon gut': 'Already good', 'Tipps fürs nächste Mal': 'Tips for next time', 'Verbesserter Text kopiert': 'Improved text copied',
    'Rechtschreibung': 'Spelling', 'Wortwahl': 'Word choice',
    // translator
    'Ganze Dokumente übersetzen. Word und PowerPoint behalten ihr Layout – Schriften, Farben, Bilder bleiben.': 'Translate whole documents. Word and PowerPoint keep their layout – fonts, colours and pictures stay.',
    'Datei wählen': 'Choose a file', 'Andere Datei wählen': 'Choose another file', 'Übersetzen nach': 'Translate to', '{0} Übersetzen': '{0} Translate', 'Lese das Dokument…': 'Reading the document…', '{0} Absätze gefunden – übersetze…': '{0} paragraphs found – translating…', 'Übersetze… {0} / {1}': 'Translating… {0} / {1}',
    'Englisch': 'English', 'Deutsch': 'German', 'Französisch': 'French', 'Italienisch': 'Italian', 'Spanisch': 'Spanish', 'Albanisch': 'Albanian', 'Türkisch': 'Turkish', 'Portugiesisch': 'Portuguese', 'Japanisch': 'Japanese',
    // presentation
    'Kairo baut eine PowerPoint mit Sprechernotizen – danach übst du deinen Vortrag Folie für Folie und bekommst Feedback.': 'Kairo builds a PowerPoint with speaker notes – then you practise your talk slide by slide and get feedback.',
    'Folien': 'Slides', '{0} Präsentation erstellen': '{0} Create presentation', 'Kairo baut deine Präsentation…': 'Kairo is building your presentation…', '{0} Folien': '{0} slides', '{0} Vortrag üben': '{0} Practise the talk',
    'Vortrag üben · Folie {0} von {1}': 'Practise · slide {0} of {1}', 'Sprechernotizen anzeigen': 'Show speaker notes', 'Drück auf das Mikrofon und erkläre die Folie': 'Press the microphone and explain the slide', 'Überspringen {0}': 'Skip {0}', 'Überspringen': 'Skip',
    'Kairo hört zu… nochmal drücken, wenn du fertig bist': 'Kairo is listening… press again when you are done', 'Werte aus…': 'Evaluating…', 'Feedback': 'Feedback', 'Punkte': 'points', '{0} {1} Wörter/Min {2}': '{0} {1} words/min {2}',
    '· etwas schnell': '· a bit fast', '· etwas langsam': '· a bit slow', '· gut': '· good', 'Nächste Folie': 'Next slide', 'Auswertung': 'Results', '{0} Nochmal': '{0} Again', 'Durchschnitt': 'Average',
    'Stark! Du bist bereit.': 'Great! You are ready.', 'Gut – noch ein Durchgang und es sitzt.': 'Good – one more round and you’ve got it.', 'Übung macht den Meister.': 'Practice makes perfect.', '{0} Nochmal üben': '{0} Practise again', 'Füllwörter: {0}': 'Filler words: {0}', 'Vergessen: {0}': 'Forgot: {0}',
    // code assistant
    'Öffne einen Projekt-Ordner: Kairo versteht das ganze Projekt, findet Fehler und beantwortet Fragen. Kairo liest nur – es ändert nie deine Dateien.': 'Open a project folder: Kairo understands the whole project, finds bugs and answers questions. Kairo only reads – it never changes your files.',
    'Projekt-Ordner öffnen': 'Open project folder', '{0} Dateien': '{0} files', 'Datei suchen…': 'Search file…', '{0} Analyse': '{0} Analysis', '{0} Fragen': '{0} Questions', 'Kairo liest das Projekt…': 'Kairo is reading the project…', 'Struktur, Fehler, Verbesserungen': 'Structure, bugs, improvements',
    'Frag mich alles zu': 'Ask me anything about', 'Frage zum Code…': 'Question about the code…', 'Kairo liest den Code…': 'Kairo is reading the code…', '{0} Erklär mir diese Datei': '{0} Explain this file',
    'Gefundene Probleme': 'Problems found', 'Verbesserungen': 'Improvements', 'Nächste Schritte': 'Next steps', 'Struktur': 'Structure', 'Sicherheit': 'Security', 'Doku': 'Docs', 'hoch': 'high', 'mittel': 'medium', 'tief': 'low',
    // dashboard
    'Deine Live-Daten auf einen Blick. Aktualisiert sich alle 5 Minuten.': 'Your live data at a glance. Updates every 5 minutes.', '{0} Bauen': '{0} Build', '{0} Standard': '{0} Default', '{0} Aktualisieren': '{0} Refresh',
    'Zeit': 'Time', 'Wetter': 'Weather', 'Euro → Franken': 'Euro → Swiss franc', 'Projekte': 'Projects', 'Lernpfade': 'Learning paths', 'Heute in der Geschichte': 'On this day in history', '{0} · Wind {1}': '{0} · Wind {1}', 'Sonnig': 'Sunny', 'Leicht bewölkt': 'Partly cloudy', 'Bewölkt': 'Cloudy',
    'Regen': 'Rain', 'Schnee': 'Snow', 'Schauer': 'Showers', 'Gewitter': 'Thunderstorm', '7 Tage': '7 days', '30 Tage': '30 days', 'Heute!': 'Today!', 'Nichts verstanden': 'Did not understand',
    'Noch keine Projekte – starte eins im Projekt-Manager.': 'No projects yet – start one in the project manager.', 'Noch kein Lernpfad.': 'No learning path yet.', 'Tag {0}/{1}': 'Day {0}/{1}', 'Entfernen': 'Remove',
    // projects
    'Grosses Ziel → Meilensteine, Aufgaben, Fortschritt. Kairo coacht dich bis zum Ziel.': 'Big goal → milestones, tasks, progress. Kairo coaches you all the way.', 'Bis wann?': 'By when?', '{0} Plan erstellen': '{0} Create plan',
    'Kairo plant dein Projekt…': 'Kairo is planning your project…', '{0} Alle Projekte': '{0} All projects', '{0} Coach fragen': '{0} Ask the coach', 'Heute in 15 Min:': 'Today in 15 min:', 'Risiken': 'Risks', 'Projekt löschen?': 'Delete project?',
    'Coach denkt nach…': 'Coach is thinking…', 'Projekt geschafft!': 'Project done!', '{0}/{1} Aufgaben': '{0}/{1} tasks', '{0}/{1} Aufgaben · bis {2}': '{0}/{1} tasks · by {2}',
    // exam
    'Eine echte Prüfung mit Zeitlimit. Kairo korrigiert, gibt dir eine Note (1–6) und sagt dir genau, was du üben musst.': 'A real exam with a time limit. Kairo marks it, gives you a grade (1–6) and tells you exactly what to practise.',
    'Fach, z. B. Mathe': 'Subject, e.g. maths', 'Thema, z. B. Lineare Funktionen': 'Topic, e.g. linear functions', 'Primar': 'Primary', 'Sek': 'Secondary', 'Gymi': 'High school', 'Berufsschule': 'Vocational school',
    '6 Fragen': '6 questions', '10 Fragen': '10 questions', '15 Fragen': '15 questions', '{0} Prüfung starten': '{0} Start exam', 'Deine Prüfungen': 'Your exams', 'Fach und Thema eingeben': 'Enter subject and topic', 'Kairo erstellt deine Prüfung…': 'Kairo is creating your exam…',
    '{0} · {1} Punkte': '{0} · {1} points', 'Abgeben': 'Hand in', 'Rechenweg und Ergebnis…': 'Working and result…', 'Deine Antwort…': 'Your answer…', 'Zeit ist um!': 'Time is up!', 'Kairo korrigiert…': 'Kairo is marking…',
    'Note': 'Grade', '{0} / {1} Punkte': '{0} / {1} points', 'Hervorragend!': 'Excellent!', 'Gut gemacht!': 'Well done!', 'Bestanden.': 'Passed.', 'Noch nicht ganz – du schaffst das.': 'Not quite yet – you can do it.', 'Dein Übungsplan': 'Your practice plan',
    'Deine Antwort': 'Your answer', 'Musterlösung': 'Model answer', '{0} Neue Prüfung': '{0} New exam', 'Noch nicht alle Fragen beantwortet. Trotzdem abgeben?': 'Not all questions answered. Hand in anyway?', 'Richtig': 'Correct', 'Richtig wäre: {0}': 'Correct would be: {0}', '{0} P.': '{0} pts', '{0}/{1} P.': '{0}/{1} pts', '{0} P. · {1}': '{0} pts · {1}',
    // language tutor
    'Sprich mit deinem KI-Lehrer. Er antwortet mit Stimme, korrigiert deine Fehler und passt sich deinem Niveau an.': 'Talk with your AI tutor. It answers by voice, corrects your mistakes and adapts to your level.',
    'Sprache': 'Language', 'Niveau': 'Level', 'Situation': 'Situation', 'A1 Anfänger': 'A1 beginner', 'C1 Profi': 'C1 advanced', 'Smalltalk': 'Small talk', 'Reisen': 'Travelling', 'Vorstellungsgespräch': 'Job interview', '{0} Gespräch starten': '{0} Start conversation',
    'Sprich oder schreib auf {0}…': 'Speak or write in {0}…',
    // learning path
    'Sag, was du lernen willst – Kairo baut einen Plan mit täglichen Lektionen, Übungen und Tests.': 'Say what you want to learn – Kairo builds a plan with daily lessons, exercises and tests.', 'z. B. Programmieren mit Python, Gitarre, Finanzen verstehen': 'e.g. coding in Python, guitar, understanding money',
    '14 Tage': '14 days', '60 Tage': '60 days', '15 Min/Tag': '15 min/day', '30 Min/Tag': '30 min/day', '60 Min/Tag': '60 min/day', '{0} Lernpfad bauen': '{0} Build learning path', 'Kairo plant deinen Lernpfad…': 'Kairo is planning your learning path…',
    'Das dauert etwa eine Minute': 'This takes about a minute', 'Tag {0} von {1} · {2} Min/Tag': 'Day {0} of {1} · {2} min/day', '{0} Alle Lernpfade': '{0} All learning paths', '{0} Weiter mit Tag {1}': '{0} Continue with day {1}', 'Tag {0}': 'Day {0}',
    'Lernpfad löschen?': 'Delete learning path?', 'Tag {0}: {1}': 'Day {0}: {1}', 'Kairo bereitet die Lektion vor…': 'Kairo is preparing the lesson…', '{0} Übersicht': '{0} Overview', 'Tag {0} von {1}': 'Day {0} of {1}', '{0} Beispiel': '{0} Example', 'Übungen': 'Exercises',
    'Lösung zeigen': 'Show solution', 'Zusammenfassung': 'Summary', 'Mini-Test:': 'Mini test:', '{0} Tag {1} abschliessen': '{0} Finish day {1}', 'Tag {0} geschafft!': 'Day {0} done!', 'Lernpfad geschafft!': 'Learning path done!',
    // brand kit
    'Eine komplette Marke aus einer Idee: Name, Logo, Farben, Schriften, Slogans, Visitenkarte, Social-Media-Posts – und eine Website dazu.': 'A complete brand from one idea: name, logo, colours, fonts, slogans, business card, social posts – and a website.',
    'z. B. Mein Gaming-Kanal über Strategiespiele, cool und modern': 'e.g. my gaming channel about strategy games, cool and modern', '{0} Marke erstellen': '{0} Create brand', 'Kairo entwickelt deine Marke…': 'Kairo is creating your brand…', 'Name, Farben, Logos – etwa eine Minute': 'Name, colours, logos – about a minute',
    'Logo-Varianten': 'Logo variants', 'Farben': 'Colours', 'Schriften': 'Fonts', 'Persönlichkeit': 'Personality', 'Zielgruppe:': 'Audience:', 'Visitenkarte & Posts': 'Business card & posts', 'Slogans': 'Slogans', 'Social-Bio': 'Social bio',
    '{0} Logos als PNG speichern': '{0} Save logos as PNG', '{0} Brand-Guide PDF': '{0} Brand guide PDF', '{0} Website daraus bauen': '{0} Build a website from it', 'Bio kopiert': 'Bio copied', '{0} kopiert': '{0} copied',
    // agent
    'Gib Kairo eine grosse Aufgabe. Es plant die Schritte, du gibst sie frei, und Kairo erledigt alles nacheinander – du siehst live zu.': 'Give Kairo a big task. It plans the steps, you approve them, and Kairo does everything in order – you watch live.',
    'z. B. Bereite meinen Vortrag über erneuerbare Energien vor: recherchieren, Präsentation und Handout': 'e.g. Prepare my talk about renewable energy: research, presentation and handout',
    '{0} Kairo erstellt nur Dateien in deinem Kairo-Ordner. Es sendet, kauft oder löscht nichts.': '{0} Kairo only creates files in your Kairo folder. It never sends, buys or deletes anything.',
    'Bereite meinen Vortrag über Japan vor: Recherche, Präsentation, Quellen': 'Prepare my talk about Japan: research, presentation, sources', 'Ich will eine Lehre als Informatiker: Bewerbung, Lebenslauf und Projektplan': 'I want an IT apprenticeship: application, CV and project plan',
    'Starte meinen YouTube-Kanal über Gaming: Marke, Website, Projektplan': 'Start my gaming YouTube channel: brand, website, project plan', 'Ich habe nächste Woche eine Prüfung über den Zweiten Weltkrieg: Lernpfad und Übungsprüfung': 'I have an exam about World War II next week: learning path and practice exam',
    'Kairo plant die Schritte…': 'Kairo is planning the steps…', 'bereit': 'ready', '{0} Los – alles erledigen': '{0} Go – do it all', 'Anderer Plan': 'Another plan', 'Kairo arbeitet…': 'Kairo is working…', 'sucht…': 'searching…', 'verbessert…': 'improving…',
    '{0} Ansehen': '{0} View', 'Bericht (PDF)': 'Report (PDF)', '{0} Quellen (PDF)': '{0} sources (PDF)', 'Auftrag erledigt!': 'Task done!',
    // memory
    'Alles, was Kairo über dich weiss – transparent. Du kannst jeden Eintrag ändern oder löschen. Gespeichert nur auf deinem PC.': 'Everything Kairo knows about you – transparent. You can edit or delete any entry. Stored only on your PC.',
    'Erinnerungen': 'Memories', 'Kategorien': 'Categories', 'nur lokal': 'local only', 'Suchen…': 'Search…', '{0} Automatisch sortieren': '{0} Sort automatically', '{0} Alles vergessen': '{0} Forget everything', '{0} Merken': '{0} Remember', 'Sortiere…': 'Sorting…',
    'Etwas, das Kairo sich merken soll, z. B. „Ich spiele Fussball beim FC Basel“': 'Something Kairo should remember, e.g. “I play football at my local club”', 'Kairo hat sich noch nichts gemerkt.': 'Kairo has not remembered anything yet.', 'Unsortiert': 'Unsorted', 'Vergessen': 'Forget',
    'Wirklich ALLES vergessen, was Kairo über dich weiss?': 'Really forget EVERYTHING Kairo knows about you?', 'Sicher? Das kann nicht rückgängig gemacht werden.': 'Sure? This cannot be undone.', 'Kairo hat alles vergessen': 'Kairo forgot everything',
    // ---------- Builder ----------
    'Kairo Builder': 'Kairo Builder', 'Bauen mit KI': 'Build with AI', 'Skizze → App': 'Sketch → app', 'Website': 'Website', 'Ideen-Shop': 'Idea shop', 'Projekte ': 'Projects', 'neues-projekt': 'new-project', 'Rückgängig': 'Undo', 'Wiederholen': 'Redo', 'Desktop': 'Desktop', 'Handy': 'Phone', 'Vollbild': 'Full screen', 'Im Browser öffnen': 'Open in browser', 'Ordner zeigen': 'Show folder',
    'Sag oder schreib, was sich ändern soll – z. B. „mach den Knopf rot“': 'Say or type what should change – e.g. “make the button red”', 'Sprechen': 'Speak',
    'Hier entsteht dein Projekt': 'Your project appears here', 'Male eine Skizze, beschreib eine Website oder wähle etwas im Ideen-Shop.': 'Draw a sketch, describe a website or pick something in the idea shop.',
    'Male grob, wie deine App aussehen soll – Kästen, Knöpfe, Text. Kairo macht daraus eine echte, funktionierende App.': 'Roughly draw what your app should look like – boxes, buttons, text. Kairo turns it into a real, working app.',
    'Skizzenblock öffnen': 'Open sketch pad', 'Mit der Maus zeichnen oder ein Foto deiner Papier-Skizze laden': 'Draw with the mouse or load a photo of your paper sketch', 'Was soll es sein?': 'What should it be?', 'z. B. Ein Quiz über Fussball mit 10 Fragen und Punkten': 'e.g. a football quiz with 10 questions and points',
    '{0} App bauen': '{0} Build app', 'Tipp: Schreib Wörter in die Skizze, z. B. „Start“ auf einen Knopf – Kairo liest sie mit.': 'Tip: write words into the sketch, e.g. “Start” on a button – Kairo reads them.',
    'Stift': 'Pen', 'Kasten': 'Box', 'Text': 'Text', 'Radierer': 'Eraser', 'Alles löschen': 'Clear all', 'Foto laden': 'Load photo', '{0} Daraus bauen': '{0} Build from it', '{0} Hier zeichnen': '{0} Draw here', 'Text für die Skizze:': 'Text for the sketch:', 'Zeichne zuerst etwas': 'Draw something first',
    'Beschreib die App oder zeichne eine Skizze': 'Describe the app or draw a sketch', 'Kairo liest deine Skizze…': 'Kairo is reading your sketch…', 'Kairo baut deine App…': 'Kairo is building your app…', 'aus deiner Skizze': 'from your sketch',
    'Skizze verstehen': 'Understand the sketch', 'Layout entwerfen': 'Design the layout', 'Logik programmieren': 'Program the logic', 'Design polieren': 'Polish the design', 'App fertig!': 'App ready!',
    'Marke vom Logo-Macher': 'Brand from the logo maker', 'Worum geht es?': 'What is it about?', 'z. B. Website für meinen Minecraft-Server mit Regeln, Team und Discord-Link': 'e.g. website for my Minecraft server with rules, team and Discord link',
    'Kairo wählt': 'Kairo picks', 'Dunkel & edel': 'Dark & premium', 'Hell & clean': 'Light & clean', 'Bunt & laut': 'Bold & colourful', 'Gaming': 'Gaming', 'Luxus': 'Luxury', 'Wie lange soll Kairo daran arbeiten?': 'How long should Kairo work on it?',
    'Qualität': 'Quality', 'Schneller Entwurf': 'Quick draft', 'Gut': 'Good', 'Sehr gut': 'Very good', 'Profi': 'Pro', 'Meisterwerk': 'Masterpiece', '1 Entwurf + ~{0} Verbesserungs-Runden': '1 draft + ~{0} improvement rounds', 'Erster Entwurf (+ 1 Runde, wenn Zeit bleibt)': 'First draft (+ 1 round if time is left)',
    '{0} Website bauen': '{0} Build website', '{0} Jetzt fertig machen': '{0} Finish now', 'übrig': 'left', 'Erster Entwurf': 'First draft', 'Runde {0}: {1}': 'Round {0}: {1}', 'Fertig nach {0} · {1} Runden': 'Done after {0} · {1} rounds', 'Kairo macht die laufende Runde fertig…': 'Kairo is finishing the current round…',
    'Design verfeinern': 'Refine the design', 'Hero mit Wow-Effekt': 'Hero with a wow effect', 'Animationen': 'Animations', 'Mehr Inhalt': 'More content', 'Handy-Ansicht': 'Phone view', 'Interaktive Elemente': 'Interactive elements', 'Fehler & Feinschliff': 'Fixes & polish', 'Details & Icons': 'Details & icons',
    'Beschreib zuerst die Website': 'Describe the website first', 'Kairo entwirft deine Website…': 'Kairo is designing your website…', 'Struktur planen': 'Plan the structure', 'Texte schreiben': 'Write the texts', 'Design bauen': 'Build the design', 'Fehler': 'Error', 'übersprungen': 'skipped', 'Website fertig!': 'Website ready!',
    'Fertige Startideen. Ein Klick – Kairo legt los. Danach kannst du alles per Stimme ändern.': 'Ready-made starting ideas. One click – Kairo gets going. Then change anything by voice.', 'Überrasch mich': 'Surprise me', 'Kairo wählt eine zufällige Idee': 'Kairo picks a random idea',
    'Spiele': 'Games', 'Apps': 'Apps', 'Websites': 'Websites', 'Tools': 'Tools', 'App': 'App', 'Wähle die Zeit und drück „Website bauen“': 'Pick the time and press “Build website”',
    'Neon-Snake mit Power-ups': 'Neon snake with power-ups', 'Weltraum-Shooter': 'Space shooter', 'Penalty-Schiessen': 'Penalty shoot-out', 'Reaktions-Test': 'Reaction test', 'Jump & Run': 'Platformer', 'Memory Deluxe': 'Memory deluxe',
    'Lern-Karteikarten': 'Study flashcards', 'Gewohnheits-Tracker': 'Habit tracker', 'Taschengeld-Planer': 'Pocket money planner', 'Pomodoro-Timer': 'Pomodoro timer', 'Wetter-Dashboard': 'Weather dashboard', 'Musik-Player-Design': 'Music player design',
    'Gaming-Clan': 'Gaming clan', 'YouTube-Kanal': 'YouTube channel', 'Fussball-Verein': 'Football club', 'Startup-Idee': 'Startup idea', 'Portfolio': 'Portfolio', 'Restaurant': 'Restaurant',
    'Passwort-Generator': 'Password generator', 'Einheiten-Umrechner': 'Unit converter', 'Notenrechner': 'Grade calculator', 'Zufalls-Entscheider': 'Random decider', 'Farbpaletten-Maker': 'Colour palette maker', 'Turnier-Baum': 'Tournament bracket',
    'Noch keine Projekte. Bau deine erste App oder Website!': 'No projects yet. Build your first app or website!', 'Kairo arbeitet noch. Trotzdem schliessen?': 'Kairo is still working. Close anyway?', 'Sprich jetzt – nochmal klicken zum Senden': 'Speak now – click again to send',
    'Bau zuerst eine App oder Website': 'Build an app or website first', 'Kairo arbeitet gerade – kurz warten': 'Kairo is working – please wait', 'Kairo baut um: {0}': 'Kairo is changing: {0}',
    // how it works
    'Kairo erklärt': 'Kairo explains', 'Wie funktioniert …?': 'How does … work?', 'Kairo zeichnet es Schritt für Schritt – mit Stimme. Danach kannst du ein Erklärvideo daraus machen.': 'Kairo draws it step by step – with voice. Then you can turn it into an explainer video.',
    'z. B. ein Kühlschrank': 'e.g. a fridge', '{0} Erklären': '{0} Explain', 'Kurz': 'Short', 'Normal': 'Normal', 'Ausführlich': 'Detailed', '4 Schritte': '4 steps', '6 Schritte': '6 steps', '9 Schritte': '9 steps',
    'ein schwarzes Loch': 'a black hole', 'das Internet': 'the internet', 'ein Flugzeug': 'a plane', 'ein Handy-Akku': 'a phone battery', 'eine Rakete': 'a rocket', 'das Herz': 'the heart', 'WLAN': 'Wi-Fi', 'ein Elektroauto': 'an electric car', 'KI wie Kairo': 'AI like Kairo', 'ein Vulkan': 'a volcano',
    'Kairo zeichnet die Erklärung…': 'Kairo is drawing the explanation…', 'Wie funktioniert': 'How it works', '{0} Erklärvideo machen': '{0} Make explainer video', 'Schritt {0} von {1}': 'Step {0} of {1}', 'Verstanden?': 'Got it?', '{0} Neues Thema': '{0} New topic',
    'Erklärvideo': 'Explainer video', 'Welches Format?': 'Which format?', 'Das Video wird in Echtzeit aufgenommen – so lange wie die Erklärung dauert. Hochladen machst du selbst.': 'The video is recorded in real time – as long as the explanation lasts. You upload it yourself.',
    'Bereite vor…': 'Preparing…', 'Stimme und Bilder werden geladen': 'Loading voice and images', 'Erklärvideo fertig!': 'Explainer video ready!', 'Gespeichert in Videos → Kairo → Erklärvideos': 'Saved in Videos → Kairo → Erklärvideos', '{0} Video zeigen': '{0} Show video',
    'Video wird noch aufgenommen…': 'The video is still recording…', 'Nimmt auf · {0} / {1}': 'Recording · {0} / {1}', 'Nicht schliessen – das Video entsteht gerade': 'Don’t close – the video is being made', 'Titel & Text kopiert': 'Title & text copied',
    // ---------- Roblox ----------
    'Roblox Studio': 'Roblox Studio', 'Prüfe Verbindung…': 'Checking connection…', 'Was soll Kairo bauen?': 'What should Kairo build?', 'z. B. Ein Obby mit 10 Levels, Checkpoints und Lava, die tötet': 'e.g. an obby with 10 levels, checkpoints and deadly lava',
    '{0} Bauen + Skripte': '{0} Build + scripts', '{0} Nur Skript': '{0} Script only', '{0} Bauplan erstellen': '{0} Create build plan', '{0} Als KI-Prompt (für Claude, ChatGPT …)': '{0} As an AI prompt (for Claude, ChatGPT …)', 'Prompt-Sprache': 'Prompt language',
    '{0} Eigene Spielidee erfinden': '{0} Invent my own game idea', '{0} KI-Antwort einfügen': '{0} Paste AI answer', 'Hier erscheint die 3D-Vorschau': 'The 3D preview appears here', 'Erst ansehen, dann mit einem Klick in Roblox Studio bauen. Alles geht mit Ctrl+Z rückgängig.': 'Look first, then build it in Roblox Studio with one click. Everything can be undone with Ctrl+Z.',
    'Obby mit 10 Levels, Checkpoints und Lava': 'Obby with 10 levels, checkpoints and lava', 'Kleines Haus mit Möbeln und Garten': 'Small house with furniture and a garden', 'Coins zum Einsammeln mit Punkte-Leaderboard': 'Collectable coins with a points leaderboard', 'Tag-Nacht-Zyklus': 'Day-night cycle',
    'Tür, die sich bei Berührung öffnet': 'Door that opens when touched', 'Turm-Parkour mit Neon-Plattformen': 'Tower parkour with neon platforms', 'Rennstrecke mit Startlinie': 'Race track with a start line', 'Shop-GUI mit Coins': 'Shop GUI with coins',
    'Mit Roblox Studio verbunden': 'Connected to Roblox Studio', 'Warte auf Roblox Studio…': 'Waiting for Roblox Studio…', 'Plugin noch nicht installiert': 'Plugin not installed yet', 'Ort: {0}': 'Place: {0}', 'Studio öffnen (oder neu starten) und einen Ort öffnen': 'Open (or restart) Studio and open a place',
    'Einmal installieren, dann Studio neu starten': 'Install once, then restart Studio', '{0} Plugin installieren': '{0} Install plugin', '✓ Plugin ist installiert': '✓ Plugin is installed', 'Auf „Plugin installieren“ klicken': 'Click “Install plugin”', 'Roblox Studio öffnen oder': 'Open Roblox Studio or', 'neu starten': 'restart it',
    'Oben im Tab': 'At the top, in the', 'ist der Knopf': 'tab, the button', '– er muss blau (an) sein': '– it must be blue (on)', 'Beim ersten Mal fragt Studio, ob das Plugin auf': 'The first time, Studio asks whether the plugin may access', 'zugreifen und Skripte einfügen darf →': 'and insert scripts →', 'Erlauben': 'Allow',
    'Plugin installiert – jetzt Roblox Studio (neu) starten': 'Plugin installed – now (re)start Roblox Studio', 'Beschreib zuerst, was gebaut werden soll': 'First describe what should be built', 'Kairo plant deinen Bau…': 'Kairo is planning your build…', 'Bauplan': 'Build plan',
    '{0} {1} Teile': '{0} {1} parts', '{0} {1} Skripte': '{0} {1} scripts', '{0} In Roblox Studio bauen': '{0} Build in Roblox Studio', '{0} Neuer Plan': '{0} New plan', 'Wird vor deiner Kamera gebaut · Ctrl+Z macht es rückgängig': 'Built in front of your camera · Ctrl+Z undoes it', 'Zuerst Roblox Studio verbinden': 'Connect Roblox Studio first',
    'Skripte': 'Scripts', 'So testest du es': 'How to test it', 'Baue in Studio…': 'Building in Studio…', '{0} Nochmal bauen': '{0} Build again', 'In Roblox Studio gebaut!': 'Built in Roblox Studio!', 'Gebaut!': 'Built!',
    'Kairo erfindet Spielideen…': 'Kairo is inventing game ideas…', 'schaut zuerst, was auf Roblox gerade beliebt ist': 'first checks what is popular on Roblox right now', 'Kairos eigene Ideen': 'Kairo’s own ideas', '3 neue Roblox-Spiele': '3 new Roblox games', 'Komplett neu erfunden – wähle eine aus.': 'Completely new – pick one.',
    '{0} Neue Ideen': '{0} New ideas', 'So spielt man': 'How to play', 'Macht süchtig': 'Addictive because', '{0} Das gibt es sonst nirgends': '{0} Nowhere else', 'Mit Freunden': 'With friends', '{0} Grosser KI-Prompt': '{0} Big AI prompt', '{0} Prototyp in Studio': '{0} Prototype in Studio',
    'Schreib den Namen des Spiels oder deine Idee': 'Write the game’s name or your idea', 'Recherchiere das Spiel…': 'Researching the game…', 'Schreibe den grossen Prompt…': 'Writing the big prompt…', 'KI-Prompt · {0}': 'AI prompt · {0}', 'Kairos eigene Spielidee.': 'Kairo’s own game idea.',
    '{0} Prompt kopieren': '{0} Copy prompt', '{0} In {1} öffnen': '{0} Open in {1}', 'Der Prompt': 'The prompt', 'Prompt kopiert – jetzt in eine KI einfügen (Ctrl+V)': 'Prompt copied – now paste it into an AI (Ctrl+V)', '{0} ist offen – Prompt ist drin': '{0} is open – the prompt is in',
    '{0} ist offen – Prompt ist kopiert: Ctrl+V und Enter': '{0} is open – prompt copied: Ctrl+V and Enter', '{0} ist offen – Ctrl+V und Enter': '{0} is open – Ctrl+V and Enter', '{0} Was Kairo über das Spiel herausgefunden hat': '{0} What Kairo found out about the game',
    'Wie willst du bauen?': 'How do you want to build?', 'Meine KI ist mit Studio verbunden': 'My AI is connected to Studio', 'Die KI legt alles selbst an, testet und repariert Fehler. Am stärksten.': 'The AI creates everything itself, tests and fixes bugs. The strongest option.',
    'KI-Antwort einfügen – Kairo baut es': 'Paste the AI answer – Kairo builds it', 'Antwort von ChatGPT/Claude reinkopieren, Kairo legt alle Dateien in Studio an.': 'Paste the answer from ChatGPT/Claude, Kairo creates all files in Studio.', 'Roblox Assistant in Studio': 'Roblox Assistant in Studio',
    'Der eingebaute KI-Assistent von Roblox, Schritt für Schritt.': 'Roblox’s built-in AI assistant, step by step.', 'Von Hand': 'By hand', 'Liste: welche Datei wohin, mit Kopieren-Knopf pro Datei.': 'List: which file goes where, with a copy button per file.',
    'So geht\'s:': 'How it works:', 'Die KI muss über': 'The AI must be connected to Studio via', 'mit Studio verbunden sein, zum Beispiel': ', for example', 'oder': 'or',
    'mit dem offiziellen Roblox-Studio-MCP (Anleitung: create.roblox.com → „Studio MCP“). Dann Studio mit deinem Spiel öffnen und den Prompt unten in diese KI geben. Der Prompt sagt ihr schon, dass sie alles selbst anlegen, testen und reparieren soll.': 'with the official Roblox Studio MCP (guide: create.roblox.com → “Studio MCP”). Then open Studio with your game and give the prompt below to that AI. The prompt already tells it to create, test and fix everything itself.',
    '{0} Bei dir ist das in Claude Code schon eingerichtet – du kannst den Prompt auch einfach dort reinkopieren, während Studio offen ist.': '{0} This is already set up for you in Claude Code – you can also paste the prompt there while Studio is open.',
    'In Roblox Studio oben auf': 'In Roblox Studio, click', 'klicken, Prompt einfügen, und nach jeder Phase „weiter“ schreiben. Der Assistant schafft kleine Schritte am besten – bei einem grossen Spiel ist Weg 1 oder 2 stärker.': 'at the top, paste the prompt and write “continue” after each phase. The Assistant handles small steps best – for a big game, option 1 or 2 is stronger.',
    'Schritt 1:': 'Step 1:', 'Diesen Prompt (mit Spezial-Format, damit Kairo die Dateien erkennt) in ChatGPT oder Claude geben.': 'Give this prompt (with a special format so Kairo can read the files) to ChatGPT or Claude.', 'Schritt 2:': 'Step 2:', 'ganze Antwort': 'whole answer',
    'kopieren und unten einfügen.{0}': 'and paste it below.{0}', 'Kairo legt dann alle Dateien in Studio an.': ' Kairo then creates all the files in Studio.', 'Kairo zeigt dir dann, welche Datei wohin gehört.': ' Kairo then shows you which file goes where.',
    '{0} Antwort der KI hier einfügen': '{0} Paste the AI’s answer here', 'Hier die komplette Antwort von ChatGPT / Claude einfügen (Ctrl+V) …': 'Paste the complete answer from ChatGPT / Claude here (Ctrl+V) …', '{0} Dateien erkennen': '{0} Detect files',
    '{0} Keine Dateien erkannt. Die Antwort braucht Zeilen wie': '{0} No files detected. The answer needs lines like', 'vor jedem Code-Block – nimm den Prompt von oben, der sagt der KI das Format.': 'before every code block – use the prompt above, it tells the AI the format.',
    '{0} Dateien erkannt': '{0} files detected', '{0} Alle in Roblox Studio einfügen': '{0} Insert all into Roblox Studio', '{0} Zuerst Roblox Studio verbinden (links oben siehst du den Status).': '{0} Connect Roblox Studio first (you can see the status at the top left).',
    '{0} In Studio im Explorer: Rechtsklick auf den Ordner → {1} → Script / LocalScript / ModuleScript, umbenennen, Code einfügen. Fehlende Ordner mit {2} anlegen.': '{0} In Studio’s Explorer: right-click the folder → {1} → Script / LocalScript / ModuleScript, rename it, paste the code. Create missing folders with {2}.',
    'Füge ein…': 'Inserting…', '{0} Nochmal einfügen': '{0} Insert again', '{0} Dateien in Studio eingefügt!': '{0} files inserted into Studio!', 'Mit Ctrl+Z in Studio rückgängig. Jetzt oben auf Play drücken und testen.': 'Undo with Ctrl+Z in Studio. Now press Play at the top and test it.',
    'KI-Antwort einfügen': 'Paste AI answer', 'Von ChatGPT / Claude nach Studio': 'From ChatGPT / Claude to Studio', 'Füge die komplette Antwort der KI ein. Kairo erkennt alle Dateien und legt sie in Roblox Studio an.': 'Paste the AI’s complete answer. Kairo detects all files and creates them in Roblox Studio.',
    'KI-Prompt für {0}': 'AI prompt for {0}', '{0} ist offen': '{0} is open', 'Der Prompt ist schon drin – nur noch Enter drücken.': 'The prompt is already in – just press Enter.', 'Prompt ({0}k Zeichen) ist kopiert: im Chatfeld': 'Prompt ({0}k characters) is copied: in the chat box press', 'und Enter.': 'and Enter.',
    '✕ Prompt fehlgeschlagen': '✕ Prompt failed', 'Inspiriert von „{0}“ – als eigenes Spiel. {1}k Zeichen · gespeichert in Dokumente → Kairo → Prompts': 'Inspired by “{0}” – as an original game. {1}k characters · saved in Documents → Kairo → Prompts',
    'Als KI-Prompt (für Claude, ChatGPT …)': 'As an AI prompt (for Claude, ChatGPT …)', 'Remake': 'Remake', 'sieht gleich aus': 'looks the same', 'Im Stil von': 'In the style of', 'eigenes Spiel': 'own game',
    'Das gleiche Spiel nochmal bauen – gleiches Gameplay, gleiches Aussehen, neuer Name': 'Build the same game again – same gameplay, same look, new name', 'Ein eigenes Spiel im Stil dieses Spiels – gleiche Art von Mechaniken, aber neue Idee': 'Your own game in the style of this game – same kind of mechanics, but a new idea',
    'Remake · {0}': 'Remake · {0}', 'Wie soll dein Remake heissen?': 'What should your remake be called?', 'Das Spiel wird gleich wie das Original – nur der Name ist neu. Wähl einen Vorschlag oder schreib einen eigenen.': 'The game will be just like the original – only the name is new. Pick a suggestion or write your own.',
    'Eigener Name': 'Your own name', 'z. B. Egg Heist Deluxe': 'e.g. Egg Heist Deluxe', '{0} Remake-Prompt erstellen': '{0} Create remake prompt', 'Tipp: Ein eigener Name ist am besten – Roblox mag keine Spiele, die so tun, als wären sie das Original.': 'Tip: your own name is best – Roblox does not like games that pretend to be the original.',
    'Remake-Prompt · {0}': 'Remake prompt · {0}', 'Remake von „{0}“ – gleiches Spiel, neuer Name. {1}k Zeichen · gespeichert in Dokumente → Kairo → Prompts': 'Remake of “{0}” – same game, new name. {1}k characters · saved in Documents → Kairo → Prompts',
    // ---------- Stream Deck ----------
    'Stream Deck': 'Stream Deck', 'Grosse Knöpfe auf deinem Handy, die Sachen auf dem PC machen. Öffne die Handy-App → Tab': 'Big buttons on your phone that do things on your PC. Open the phone app → tab', 'Handy-App öffnen (Seite': 'Open the phone app (page', '→ QR-Code)': '→ QR code)', 'Unten auf': 'Tap', 'tippen': 'at the bottom',
    'Knopf drücken – der PC macht es sofort': 'Press a button – the PC does it right away', '{0} Handy-Seite öffnen': '{0} Open phone page', 'Klick = jetzt testen': 'Click = test now', '✕ löschen · Pfeile verschieben': '✕ delete · arrows move', '{0} Fertig': '{0} Done',
    'Eigener Kairo-Befehl, z. B. Mach eine Doku über Haie': 'Your own Kairo command, e.g. Make a documentary about sharks', 'Name auf dem Knopf': 'Name on the button', 'Musik & Ton': 'Music & sound', 'PC': 'PC',
    // ---------- tidy mode / finder ----------
    'Alles': 'All', 'Alle Funktionen (Ctrl+K)': 'All features (Ctrl+K)', 'Was willst du machen? z. B. „Website“, „Prüfung“, „Jarvis“ …': 'What do you want to do? e.g. “website”, “exam”, “Jarvis” …', 'Zuletzt benutzt': 'Recently used', 'Favorit': 'Favourite',
    'wählen': 'select', 'öffnen': 'open', 'überall': 'anywhere', 'Aufgeräumter Modus': 'Tidy mode', 'Aufgeräumter Modus an': 'Tidy mode on', 'Aufgeräumter Modus aus – alle Buttons wie vorher': 'Tidy mode off – all buttons as before', 'Kairo fragen: „{0}“': 'Ask Kairo: “{0}”', 'Chat': 'Chat',
    'Deine Favoriten': 'Your favourites', 'Stern im Alles-Finder setzen, um sie zu ändern': 'Star items in the finder to change them', '{0} Alle Funktionen {1}': '{0} All features {1}', 'Alle Funktionen': 'All features',
    'Erstellen': 'Create', 'Apps, Websites, Logos, Videos': 'Apps, websites, logos, videos', 'Wissen & Recherche': 'Knowledge & research', 'Recherche, Erklärungen, Dokus': 'Research, explainers, documentaries', 'Prüfungen, Lernpfade, Sprachen': 'Exams, learning paths, languages',
    'Schreiben & Arbeiten': 'Writing & work', 'Dokumente, Projekte, Code': 'Documents, projects, code', 'Show & Spass': 'Show & fun', 'Jarvis, Spiele, Musik, Party': 'Jarvis, games, music, party', 'Werkzeuge': 'Tools', 'Suche, PC, Flüge, Wetter': 'Search, PC, flights, weather',
    'Website-Bauer': 'Website builder', 'Spiel-Macher': 'Game maker', 'Logo-Macher': 'Logo maker', 'Social Studio': 'Social Studio', 'Minecraft-Bau': 'Minecraft builder', 'Erfinder-Modus': 'Inventor mode', 'Bild erstellen': 'Create image', 'Wie funktioniert …?': 'How does … work?',
    'Was wäre wenn': 'What if', 'Sonnensystem': 'Solar system', '3D-Erde': '3D Earth', 'Schule': 'School', 'Dateien': 'Files', 'Jarvis-Modus': 'Jarvis mode', 'Haustier': 'Pet', 'Radio-Show': 'Radio show', 'Musik-Quiz': 'Music quiz', 'Welt-TV': 'World TV', 'Party!': 'Party!',
    'Musik-Visualizer': 'Music visualizer', 'Kommentator': 'Commentator', 'Wetter auf Desktop': 'Weather on desktop', 'Super-Suche': 'Super search', 'Live-Untertitel': 'Live subtitles', 'Flug verfolgen': 'Track a flight', 'Song erkennen': 'Identify a song', 'PC-Check': 'PC check', 'Heute': 'Today',
    'Handy-App': 'Phone app', 'Einrichtung (Willkommen)': 'Setup (welcome)', 'Einstellungen': 'Settings', 'Worüber soll die Doku sein?': 'What should the documentary be about?', 'Was wäre, wenn …?': 'What if …?', 'Flugnummer, z. B. LX8': 'Flight number, e.g. LX8',
    'Persönlichkeit': 'Personality', 'Anhängen': 'Attach', 'Bildschirm mitschicken': 'Send my screen', 'Aktuelle News': 'Latest news', 'Datei anhängen': 'Attach a file', 'Ordner öffnen': 'Open a folder', '{0} Passt dazu:': '{0} Matching:', '{0} {1} öffnen {2}': '{0} Open {1} {2}',
    'Schreib oder sprich mit Kairo': 'Type or talk to Kairo', 'Wetter, Favoriten, alle Funktionen, Erinnerungen': 'Weather, favourites, all features, reminders', 'Hausaufgaben, Prüfungen, Karteikarten': 'Homework, exams, flashcards', 'Flüge, Wetter-Radar, Weltreisen, Länder': 'Flights, weather radar, world tours, countries',
    'Schach, GeoGuessr, Quiz, Rätsel': 'Chess, GeoGuessr, quiz, riddles', 'Ordner öffnen und Kairo dazu fragen': 'Open a folder and ask Kairo about it', 'Handy-App verbinden, Anrufe, Alarme': 'Connect the phone app, calls, alerts', 'KI, Stimme, Aussehen, Profil': 'AI, voice, look, profile',
    // ---------- Jarvis ----------
    'J.A.R.V.I.S. PROTOKOLL AKTIV': 'J.A.R.V.I.S. PROTOCOL ACTIVE', 'BEREIT': 'READY', 'ANFRAGE ERHALTEN': 'REQUEST RECEIVED', 'ANALYSIERE…': 'ANALYSING…', 'ANTWORT ÜBERTRAGEN': 'ANSWER SENT', 'JARVIS-MODUS': 'JARVIS MODE',
    'INITIALISIERE J.A.R.V.I.S. PROTOKOLL': 'INITIALISING J.A.R.V.I.S. PROTOCOL', 'NEURALES NETZ ............ OK': 'NEURAL NETWORK ........... OK', 'SPRACHMODUL ............... OK': 'VOICE MODULE ............. OK', 'SENSOREN & DATEN .......... OK': 'SENSORS & DATA ........... OK', 'HOLOGRAFISCHE OBERFLÄCHE .. OK': 'HOLOGRAPHIC INTERFACE .... OK',
    // ---------- studio (logo, Minecraft, inventor, social) ----------
    'Logo & Banner': 'Logo & banner', 'Für deinen YouTube-, TikTok- oder Discord-Kanal, ein Team oder eine Idee.': 'For your YouTube, TikTok or Discord channel, a team or an idea.', '{0} Entwerfen': '{0} Design', 'Kairo entwirft 3 Logos…': 'Kairo is designing 3 logos…', 'Logo-Studio': 'Logo studio',
    'Vorschau': 'Preview', '{0} Alle Grössen speichern': '{0} Save all sizes', '{0} Neue Entwürfe': '{0} New designs', 'Entwurf {0}': 'Design {0}', 'Profilbild': 'Profile picture', '✓ Gespeichert in Bilder/Kairo/Logos': '✓ Saved in Pictures/Kairo/Logos',
    'Gaming-Kanal mit Drachen': 'Gaming channel with dragons', 'Fussball-Team FC Blitz': 'Football team FC Lightning', 'Minecraft-Server „Skyland“': 'Minecraft server “Skyland”', 'Rap-Künstler „Arbi“': 'Rapper “Arbi”',
    'Minecraft-Bauplaner': 'Minecraft build planner', 'Beschreib dein Bauwerk – Kairo plant es Block für Block, mit 3D-Vorschau und Befehlen.': 'Describe your build – Kairo plans it block by block, with a 3D preview and commands.', '{0} Planen': '{0} Plan',
    'Burg mit Türmen und Burggraben': 'Castle with towers and a moat', 'Modernes Haus mit Pool': 'Modern house with a pool', 'Gemütliche Holzhütte': 'Cosy wooden cabin', 'Japanischer Tempel': 'Japanese temple', 'Leuchtturm am Meer': 'Lighthouse by the sea', 'Weltraum-Rakete': 'Space rocket',
    'Kairo plant dein Bauwerk…': 'Kairo is planning your build…', 'Minecraft · {0} Teile': 'Minecraft · {0} parts', 'Ebene': 'Layer', 'alle': 'all', '{0} So baust du es': '{0} How to build it', '{0} Befehle kopieren': '{0} Copy commands', '{0} Datei': '{0} File', '✓ Befehle kopiert': '✓ Commands copied',
    'Im Spiel: Cheats an, hinstellen, Befehle einfügen. Das Bauwerk entsteht 2 Blöcke vor dir.': 'In the game: cheats on, stand still, paste the commands. The build appears 2 blocks in front of you.', 'Material': 'Materials',
    'Deine Idee für eine App, ein Spiel, einen Kanal oder ein Business – Kairo macht einen Plan daraus.': 'Your idea for an app, a game, a channel or a business – Kairo turns it into a plan.', '{0} Durchplanen': '{0} Make a plan',
    'YouTube-Kanal über Fussball-Tricks': 'YouTube channel about football tricks', 'App für Hausaufgaben mit Freunden': 'Homework app with friends', 'Eigenes Handy-Spiel': 'My own phone game', 'Discord-Bot für Gamer': 'Discord bot for gamers', 'Sneaker-Reinigungs-Service': 'Sneaker cleaning service',
    'Kairo denkt wie ein Erfinder…': 'Kairo is thinking like an inventor…', '{0} Problem': '{0} Problem', '{0} Lösung': '{0} Solution', '{0} Für wen': '{0} For whom', 'Features': 'Features', '{0} Geld': '{0} Money', 'Der Plan': 'The plan', 'Heute in 30 Minuten': 'Today in 30 minutes', 'Start-Kosten': 'Starting costs',
    '{0} Logo dazu': '{0} Logo for it', '{0} Präsentation': '{0} Presentation', 'Präsentation wird erstellt…': 'Creating presentation…',
    'Kairo Social Studio': 'Kairo Social Studio', 'Videos für TikTok & YouTube': 'Videos for TikTok & YouTube', 'Kairo macht ein fertiges Hochformat-Video über sich selbst – mit Stimme, Animationen und Untertiteln. Hochladen machst du selbst.': 'Kairo makes a finished vertical video about itself – with voice, animations and captions. You upload it yourself.',
    'Warum Kairo?': 'Why Kairo?', 'Update-Video': 'Update video', 'Feature-Spotlight': 'Feature spotlight', 'Kurz-Tutorial': 'Quick tutorial', 'Extra-Wunsch (optional), z. B. „über den Jarvis-Modus“': 'Extra wish (optional), e.g. “about Jarvis mode”', '{0} Video erstellen': '{0} Create video',
    'Hier entsteht dein Video': 'Your video appears here', '{0} Schreibe das Drehbuch…': '{0} Writing the script…', '{0} Nimmt die Stimme auf…': '{0} Recording the voice…', '{0} Nimmt die Stimme auf… {1}/{2}': '{0} Recording the voice… {1}/{2}', 'Nimmt die Stimme auf… {0}/{1}': 'Recording the voice… {0}/{1}', '{0} von {1} Sätzen ohne Stimme': '{0} of {1} lines without voice', 'Für die Stimme brauchst du einen Gemini- oder OpenAI-Schlüssel (Einstellungen).': 'The voice needs a Gemini or OpenAI key (Settings).', 'Tageslimit der KI-Stimme erreicht – später nochmal versuchen': 'daily limit of the AI voice reached, try again later', '{0} Video wird aufgenommen…': '{0} Recording the video…', '{0} Neues Video': '{0} New video', '{0} Video fertig!': '{0} Video ready!',
    'TikTok-Text': 'TikTok text', 'YouTube-Titel': 'YouTube title', 'YouTube-Beschreibung': 'YouTube description', '{0} Auf TikTok hochladen': '{0} Upload to TikTok', 'Tipp: Text kopieren → beim Hochladen einfügen. Kairo postet nie selbst.': 'Tip: copy the text → paste it when uploading. Kairo never posts by itself.',
    'TikTok-Text kopiert': 'TikTok text copied', 'Entwickler-Modus': 'Developer mode', 'Automatisch merken': 'Remember automatically', 'Kairo merkt sich wichtige Sachen aus dem Chat (Hobbys, Prüfungen …). Bleibt nur auf diesem PC.': 'Kairo remembers important things from the chat (hobbies, exams …). Stays on this PC only.', '{0} Kairo spielt': '{0} Kairo plays', '{0} Kairo schaut…': '{0} Kairo is looking…', 'Ich schaue mir das Foto an …': 'Looking at the photo …', 'Kairo tippt: {0}': 'Kairo guesses: {0}', 'Zeigt Werkzeuge nur für den Entwickler von Kairo (Social Studio)': 'Shows tools only for the developer of Kairo (Social Studio)', 'Das Social Studio gibt es nur im Entwickler-Modus (Einstellungen).': 'The Social Studio is only available in developer mode (Settings).', '{0} Auf YouTube hochladen': '{0} Upload to YouTube', 'Titel kopiert': 'Title copied', 'Kopiert – jetzt bei YouTube einfügen (Strg+V)': 'Copied, now paste it on YouTube (Ctrl+V)', 'Ziehe das Video aus dem Ordner in das YouTube-Fenster.': 'Drag the video from the folder into the YouTube window.', 'Titel:': 'Title:', 'Beschreibung:': 'Description:', '{0} Titel kopieren': '{0} Copy title', '{0} Beschreibung kopieren': '{0} Copy description', 'Bei „Speziell für Kinder?“ wähle „Nein“, dann 3× „Weiter“.': 'At “Made for kids?” choose “No”, then click “Next” 3 times.', 'Wähle „Öffentlich“ und klicke „Veröffentlichen“.': 'Choose “Public” and click “Publish”.', 'YouTube-Text kopiert': 'YouTube text copied', '✕ Video leer – bitte nochmal': '✕ Video is empty – please try again', 'Gratis · Link in Bio': 'Free · link in bio', 'WIE FUNKTIONIERT': 'HOW IT WORKS', 'ZUSAMMENGEFASST': 'SUMMARY', 'Erklärt von Kairo': 'Explained by Kairo', 'SCHRITT {0} / {1}': 'STEP {0} / {1}'
  };

  // patterns for texts with numbers/names in them, and short versions without the leading icon placeholder
  const exact = new Map(), patterns = [];
  const addOne = (de, en) => {
    if (!/\{\d\}/.test(de)) { exact.set(de, en); return; }
    const rx = new RegExp('^' + de.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{(\d)\\?\}/g, '(.+?)') + '$');
    const order = [...de.matchAll(/\{(\d)\}/g)].map(m => +m[1]);
    patterns.push({ rx, en, order });
  };
  for (const [de, en] of Object.entries(EN)) {
    addOne(de, en);
    // "{0} Neue Recherche" is shown as icon + " Neue Recherche": also match it without the {0}
    if (/^\{0\} /.test(de) && /^\{0\} /.test(en)) addOne(de.slice(4).replace(/\{(\d)\}/g, (m, n) => '{' + (n - 1) + '}'), en.slice(4).replace(/\{(\d)\}/g, (m, n) => '{' + (n - 1) + '}'));
  }
  function tr(text) {
    const t = text.trim(); if (!t) return null;
    let out = exact.get(t);
    if (out == null) {
      for (const p of patterns) {
        const m = t.match(p.rx); if (!m) continue;
        out = p.en.replace(/\{(\d)\}/g, (x, n) => { const i = p.order.indexOf(+n); const v = i >= 0 ? m[i + 1] : x; return exact.get(v) ?? v; });
        break;
      }
    }
    if (out == null) return null;
    return text.replace(t, out);
  }
  const active = () => { try { return (window.App?.settings?.()?.language || window.APP_LANG || 'de') !== 'de'; } catch { return false; } };
  window.L = s => (active() ? tr(String(s)) ?? s : s); // for texts drawn on canvas

  // never touch chat messages, AI answers, code or anything the user can type into
  const SKIP = 'script, style, textarea, input, select, pre, code, [contenteditable], .msg, .md, .cd-msg, .lg-msg, .rb-prompt, .cc-text, .rs-report section, .dc-paper, .ls, .tn-slide, .so-card, .hw-cap, .hw-intro, .rb-idea, .bk-hero, .bk-font, .pj-hero h1, .pj-task, .mm-item, .ag-plan > p, .ag-plan h2';
  function walk(root) {
    if (!active() || !root) return;
    if (root.nodeType === 3) { fix(root); return; }
    if (root.nodeType !== 1 || root.closest?.('.msg, .md')) return;
    for (const a of ['placeholder', 'title', 'aria-label']) attr(root, a);
    if (root.closest(SKIP)) return;
    // inputs are skipped for their text, but their placeholder and tooltip are UI too
    root.querySelectorAll?.('[placeholder], [title], [aria-label]').forEach(el => { if (!el.closest('.msg, .md')) for (const a of ['placeholder', 'title', 'aria-label']) attr(el, a); });
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: n => (n.nodeType === 1 && n.matches(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = w.nextNode())) {
      if (n.nodeType === 3) fix(n);
    }
  }
  function attr(el, a) {
    if (!el.hasAttribute?.(a)) return;
    const cur = el.getAttribute(a), v = tr(cur);
    if (v != null && v !== cur) el.setAttribute(a, v); // only when it changes, or the observer would loop
  }
  function fix(node) {
    if (node.parentElement?.closest(SKIP)) return;
    const v = tr(node.nodeValue); if (v != null && v !== node.nodeValue) node.nodeValue = v;
  }
  const obs = new MutationObserver(muts => {
    if (!active()) return;
    for (const m of muts) {
      if (m.type === 'characterData') fix(m.target);
      else if (m.type === 'attributes') walk(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  const start = () => { obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] }); walk(document.body); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  // toasts and the browser's own dialogs
  const wrap = name => { const orig = window[name]; if (typeof orig === 'function') window[name] = function (msg, ...rest) { return orig.call(this, active() ? (tr(String(msg ?? '')) ?? msg) : msg, ...rest); }; };
  ['confirm', 'prompt', 'alert'].forEach(wrap);
  window.addEventListener('load', () => { const t = window.toast; if (typeof t === 'function') window.toast = m => { const s = String(m ?? ''), x = s.replace(/^✕ /, ''); return t(active() ? (s.startsWith('✕ ') ? '✕ ' + (tr(x) ?? x) : (tr(s) ?? s)) : s); }; });
})();
