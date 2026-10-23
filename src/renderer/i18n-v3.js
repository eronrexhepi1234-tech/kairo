// Translations for Smart Home, faces, webcam, translator, mini orb, clips, flashcards, read-aloud, focus stats.
Object.assign(I18N.en, {
  'nav.home': 'Home', 'home.sub': 'Your smart lights — tap, slide, or just say "make the light purple".', 'home.add': 'Add lamp', 'home.demo': 'Demo lamp', 'home.demoAdded': 'Demo lamp added — try "make the light purple"',
  'home.emptyH': 'No lamps yet', 'home.empty': 'Add your lamps (Hue, WiZ, Govee, Yeelight, LIFX, Home Assistant) or try a demo lamp first.',
  'home.rename': 'Rename', 'home.room': 'Room (optional)', 'home.remove': 'Remove', 'home.which': 'Which lamps do you have?', 'home.scanAll': 'Search my Wi-Fi',
  'home.hintHue': 'Kairo finds the Hue bridge. Then press the round button on top of the bridge and click "Pair".',
  'home.hintWiz': 'Lamp set up in the WiZ app and in the same Wi-Fi as this PC — that\'s all.',
  'home.hintGovee': 'In the Govee Home app: open the lamp → settings → switch on "LAN Control".',
  'home.hintYee': 'In the Yeelight / Mi Home app: open the lamp → settings → switch on "LAN Control".',
  'home.hintHa': 'Home Assistant connects almost every brand. In Home Assistant: your profile → Security → "Long-lived access tokens" → create.',
  'home.hintTuya': 'Tuya / Smart Life / IKEA lamps only work through their cloud. The easiest way: install Home Assistant, add the Tuya or IKEA integration there, then connect Home Assistant here.',
  'home.lifxHow': 'Create a personal token at', 'home.connect': 'Connect', 'home.haToken': 'The token stays on this PC, encrypted.', 'home.scanning': 'Searching your Wi-Fi for lamps…',
  'home.firewall': 'If Windows asks about the firewall: allow for private networks only.', 'home.pair': 'Pair', 'home.addOne': 'Add', 'home.nothing': 'No lamps found. Are they on and in the same Wi-Fi? Or add one by IP address.',
  'home.manual': 'Add by IP address', 'home.again': 'Search again', 'home.close': 'Done', 'home.lampsAdded': 'lamps added',
  'scene.gaming': 'Gaming', 'scene.lernen': 'Study', 'scene.film': 'Movie', 'scene.chill': 'Chill', 'scene.party': 'Party', 'scene.schlafen': 'Sleep', 'scene.morgen': 'Morning', 'scene.aus': 'All off'
});
Object.assign(I18N.de, {
  'nav.home': 'Zuhause', 'home.sub': 'Deine smarten Lampen – antippen, schieben oder einfach sagen „Mach das Licht lila".', 'home.add': 'Lampe hinzufügen', 'home.demo': 'Demo-Lampe', 'home.demoAdded': 'Demo-Lampe da – probier „Mach das Licht lila"',
  'home.emptyH': 'Noch keine Lampen', 'home.empty': 'Füg deine Lampen hinzu (Hue, WiZ, Govee, Yeelight, LIFX, Home Assistant) oder probier zuerst eine Demo-Lampe aus.',
  'home.rename': 'Umbenennen', 'home.room': 'Raum (optional)', 'home.remove': 'Entfernen', 'home.which': 'Welche Lampen hast du?', 'home.scanAll': 'Mein WLAN durchsuchen',
  'home.hintHue': 'Kairo findet die Hue Bridge. Dann den runden Knopf oben auf der Bridge drücken und „Koppeln" klicken.',
  'home.hintWiz': 'Lampe in der WiZ-App einrichten und im gleichen WLAN wie dieser PC – mehr braucht es nicht.',
  'home.hintGovee': 'In der Govee-Home-App: Lampe öffnen → Einstellungen → „LAN-Steuerung" einschalten.',
  'home.hintYee': 'In der Yeelight- bzw. Mi-Home-App: Lampe öffnen → Einstellungen → „LAN-Steuerung" einschalten.',
  'home.hintHa': 'Home Assistant verbindet fast jede Marke. In Home Assistant: dein Profil → Sicherheit → „Langlebige Zugriffstokens" → erstellen.',
  'home.hintTuya': 'Tuya-, Smart-Life- und IKEA-Lampen gehen nur über deren Cloud. Am einfachsten: Home Assistant installieren, dort die Tuya- oder IKEA-Integration hinzufügen und dann Home Assistant hier verbinden.',
  'home.lifxHow': 'Erstelle einen persönlichen Token unter', 'home.connect': 'Verbinden', 'home.haToken': 'Der Token bleibt verschlüsselt auf diesem PC.', 'home.scanning': 'Suche Lampen in deinem WLAN…',
  'home.firewall': 'Falls Windows nach der Firewall fragt: nur für private Netzwerke erlauben.', 'home.pair': 'Koppeln', 'home.addOne': 'Hinzufügen', 'home.nothing': 'Keine Lampen gefunden. Sind sie an und im gleichen WLAN? Oder füg eine per IP-Adresse hinzu.',
  'home.manual': 'Per IP-Adresse hinzufügen', 'home.again': 'Nochmal suchen', 'home.close': 'Fertig', 'home.lampsAdded': 'Lampen hinzugefügt',
  'scene.gaming': 'Gaming', 'scene.lernen': 'Lernen', 'scene.film': 'Film', 'scene.chill': 'Chillen', 'scene.party': 'Party', 'scene.schlafen': 'Schlafen', 'scene.morgen': 'Morgen', 'scene.aus': 'Alles aus'
});
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

Object.assign(I18N.sq, { 'nav.home': 'Shtëpia', 'home.add': 'Shto llambë', 'home.demo': 'Llambë demo', 'scene.aus': 'Fik të gjitha' });
