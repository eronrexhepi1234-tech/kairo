// Translations for Smart Home, faces, webcam, translator, mini orb, clips, flashcards, read-aloud, focus stats.
for (const [lang, names] of Object.entries({
  en: ['Orb', 'Particles', 'Rings', 'Wave', '😊 Face', '🤖 Robot', '🐱 Cat', '◡ Minimal'],
  de: ['Orb', 'Partikel', 'Ringe', 'Welle', '😊 Gesicht', '🤖 Roboter', '🐱 Katze', '◡ Minimal'],
  sq: ['Orb', 'Grimca', 'Unaza', 'Valë', '😊 Fytyrë', '🤖 Robot', '🐱 Mace', '◡ Minimal']
})) ['orb', 'particles', 'rings', 'wave', 'face-cute', 'face-robot', 'face-cat', 'face-minimal'].forEach((k, i) => { I18N[lang]['orb.' + k] = names[i]; });

Object.assign(I18N.en, {
  'voice.noCam': 'No webcam found or access denied.', 'tr.banner': 'Interpreter', 'tr.title': 'Live translator', 'tr.sub': 'Two people, two languages — Kairo interprets',
  'tr.how': 'Pick two languages. Then just talk — Kairo speaks every sentence in the other language. Great for relatives or holidays.', 'tr.start': 'Start',
  'rd.title': 'Read aloud', 'rd.sub': 'Text, web page or Word file with a natural voice', 'rd.how': 'Paste text or a web link, or open a file.', 'rd.ph': 'Text or https://… link',
  'rd.fromClip': 'From clipboard', 'rd.fromFile': 'Open file', 'rd.go': 'Read', 'rd.stop': 'Stop',
  'fc.title': 'Flashcards', 'fc.sub': 'Learn anything with smart repetition', 'fc.tab': 'Flashcards', 'fc.how': 'Type a topic, or make cards from copied text or from what is on your screen. Cards you know come back later, the others soon.',
  'fc.ph': 'e.g. French verbs être and avoir, photosynthesis, WW2 dates…', 'fc.make': 'Make cards', 'fc.fromClip': 'From copied text', 'fc.fromScreen': 'From my screen',
  'fc.cards': 'cards', 'fc.due': 'to learn', 'fc.learn': 'Learn', 'fc.none': 'No decks yet.', 'fc.making': 'Kairo writes your flashcards…', 'fc.clipEmpty': 'Copy some text first (Ctrl+C).',
  'fc.finished': 'Done for now!', 'fc.back': 'Decks', 'fc.tap': 'Tap to flip', 'fc.again': 'Again', 'fc.knew': 'Knew it',
  'clip.title': 'Clip mode', 'clip.sub': 'Off · save the last 30 s with Ctrl+Alt+C or "clip that"', 'clip.onSub': 'ON · Ctrl+Alt+C or "clip that" saves the last ~30 s', 'clip.saved': 'Clip saved', 'clip.off': 'Clip mode is off',
  'focus.title': 'Screen time today', 'focus.note': 'open programs, only while Kairo runs', 'focus.empty': 'Collecting… check back in a few minutes.',
  'focus.games': 'Games', 'focus.video': 'Videos', 'focus.study': 'Learning', 'focus.chat': 'Chat', 'focus.web': 'Web', 'focus.music': 'Music', 'focus.other': 'Other',
  'set.bg': 'Background', 'bg.none': 'None', 'bg.stars': '✨ Stars', 'bg.aurora': '🌌 Aurora', 'bg.rain': '🌧 Rain', 'bg.waves': '🌊 Waves',
  'set.mini': 'Mini orb', 'set.miniHint': 'Floating orb while Kairo is minimized'
});
Object.assign(I18N.de, {
  'voice.noCam': 'Keine Webcam gefunden oder Zugriff verweigert.', 'tr.banner': 'Dolmetscher', 'tr.title': 'Live-Übersetzer', 'tr.sub': 'Zwei Menschen, zwei Sprachen – Kairo dolmetscht',
  'tr.how': 'Wähl zwei Sprachen. Dann einfach reden – Kairo spricht jeden Satz in der anderen Sprache. Super für Verwandte oder in den Ferien.', 'tr.start': 'Starten',
  'rd.title': 'Vorlesen', 'rd.sub': 'Text, Webseite oder Word-Datei mit natürlicher Stimme', 'rd.how': 'Text oder Link einfügen oder eine Datei öffnen.', 'rd.ph': 'Text oder https://… Link',
  'rd.fromClip': 'Aus Zwischenablage', 'rd.fromFile': 'Datei öffnen', 'rd.go': 'Vorlesen', 'rd.stop': 'Stopp',
  'fc.title': 'Lernkarten', 'fc.sub': 'Alles lernen mit schlauer Wiederholung', 'fc.tab': 'Lernkarten', 'fc.how': 'Thema eingeben oder Karten aus kopiertem Text oder deinem Bildschirm machen. Was du kannst, kommt später wieder, der Rest bald.',
  'fc.ph': 'z. B. Französisch être und avoir, Fotosynthese, Jahreszahlen 2. Weltkrieg…', 'fc.make': 'Karten erstellen', 'fc.fromClip': 'Aus kopiertem Text', 'fc.fromScreen': 'Von meinem Bildschirm',
  'fc.cards': 'Karten', 'fc.due': 'zu lernen', 'fc.learn': 'Lernen', 'fc.none': 'Noch keine Stapel.', 'fc.making': 'Kairo schreibt deine Lernkarten…', 'fc.clipEmpty': 'Kopier zuerst einen Text (Ctrl+C).',
  'fc.finished': 'Fertig für jetzt!', 'fc.back': 'Stapel', 'fc.tap': 'Zum Umdrehen tippen', 'fc.again': 'Nochmal', 'fc.knew': 'Gewusst',
  'clip.title': 'Clip-Modus', 'clip.sub': 'Aus · letzte 30 s speichern mit Ctrl+Alt+C oder „Clip das"', 'clip.onSub': 'AN · Ctrl+Alt+C oder „Clip das" speichert die letzten ~30 s', 'clip.saved': 'Clip gespeichert', 'clip.off': 'Clip-Modus ist aus',
  'focus.title': 'Bildschirmzeit heute', 'focus.note': 'offene Programme, nur solange Kairo läuft', 'focus.empty': 'Sammle Daten… schau in ein paar Minuten nochmal.',
  'focus.games': 'Games', 'focus.video': 'Videos', 'focus.study': 'Lernen', 'focus.chat': 'Chat', 'focus.web': 'Web', 'focus.music': 'Musik', 'focus.other': 'Sonstiges',
  'set.bg': 'Hintergrund', 'bg.none': 'Keiner', 'bg.stars': '✨ Sterne', 'bg.aurora': '🌌 Nordlicht', 'bg.rain': '🌧 Regen', 'bg.waves': '🌊 Wellen',
  'set.mini': 'Mini-Orb', 'set.miniHint': 'Schwebender Orb, wenn Kairo minimiert ist'
});

Object.assign(I18N.en, {
  'fw.checking': 'Checking Windows Firewall…', 'fw.ok': 'Phone access allowed', 'fw.okSub': 'Only on your private home network, only the phone port.',
  'fw.blocked': 'Windows Firewall is blocking Kairo — your phone can\'t connect', 'fw.none': 'Phone access not allowed yet',
  'fw.what': 'Click the button and say "Yes" in the Windows prompt. Only the phone port is opened, only on private networks.',
  'fw.allow': 'Allow access', 'fw.waiting': 'Waiting for Windows…', 'fw.notChanged': 'Nothing changed (the Windows prompt was cancelled?)',
  'fw.public': 'Your Wi-Fi is set to "Public"', 'fw.publicSub': 'On public networks the phone can\'t connect. If this is your home Wi-Fi, set it to "Private" in Windows settings.', 'fw.openSettings': 'Open settings'
});
Object.assign(I18N.de, {
  'fw.checking': 'Prüfe Windows-Firewall…', 'fw.ok': 'Handy-Zugriff erlaubt', 'fw.okSub': 'Nur in deinem privaten Heimnetz, nur der Handy-Port.',
  'fw.blocked': 'Die Windows-Firewall blockiert Kairo – dein Handy kann sich nicht verbinden', 'fw.none': 'Handy-Zugriff noch nicht erlaubt',
  'fw.what': 'Klick auf den Knopf und sag in der Windows-Abfrage „Ja". Geöffnet wird nur der Handy-Port, nur in privaten Netzwerken.',
  'fw.allow': 'Zugriff erlauben', 'fw.waiting': 'Warte auf Windows…', 'fw.notChanged': 'Nichts geändert (Windows-Abfrage abgebrochen?)',
  'fw.public': 'Dein WLAN ist auf „Öffentlich" gestellt', 'fw.publicSub': 'In öffentlichen Netzwerken kann sich das Handy nicht verbinden. Wenn das dein WLAN zu Hause ist, stell es in den Windows-Einstellungen auf „Privat".', 'fw.openSettings': 'Einstellungen öffnen'
});

