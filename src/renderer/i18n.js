// UI translations. Missing keys fall back to English.
window.I18N = {
  en: {
    _name: 'English',
    'nav.chat': 'Chat', 'nav.earth': 'Earth', 'nav.games': 'Games', 'nav.files': 'Files', 'nav.phone': 'Phone', 'nav.settings': 'Settings',
    'chat.placeholder': 'Ask anything…  (Enter to send, Shift+Enter for a new line)',
    'chat.hello': 'Hey, I\'m {name}.', 'chat.sub': 'I can look at your screen, read the news, explore the Earth and help with your games.',
    'chat.s1': 'What\'s on my screen right now?', 'chat.s2': 'What happened today?', 'chat.s3': 'Show me the Earth', 'chat.s4': 'Which AI is best for coding? Be fair.',
    'chat.new': 'New chat', 'chat.copy': 'Copy', 'chat.speak': 'Read aloud', 'chat.sources': 'Sources',
    'chip.screen': 'Screen', 'chip.news': 'News', 'chip.folder': 'Folder',
    'status.screen': 'Looking at your screen…', 'status.news': 'Reading the news…', 'status.thinking': 'Thinking…', 'status.listening': 'Listening…',
    'err.nokey': 'No API key yet for this provider. Add one in Settings → AI.', 'err.generic': 'Something went wrong:',
    'mode.label': 'Mode',
    'persona.normal': 'Normal', 'persona.bro': 'Bro', 'persona.lockin': 'Lock-in', 'persona.mentor': 'Mentor', 'persona.butler': 'Butler',
    'lockin.timer': 'Focus', 'lockin.done': 'Focus block done. Take 5 minutes.',
    'earth.search': 'Search a place…', 'earth.what': 'What happened here?', 'earth.satellite': 'Satellite', 'earth.rotate': 'Rotate', 'earth.night': 'Night lights',
    'earth.pick': 'Click anywhere on the Earth.', 'earth.loading': 'Loading…', 'earth.ask': 'Ask in chat',
    'games.coach': 'Game Coach', 'games.coachSub': 'Kairo looks at your game and gives you hints. Pick a game, open it, then press Analyze.',
    'games.analyze': 'Analyze screen', 'games.watch': 'Auto every 20 s', 'games.overlay': 'Overlay on top of game',
    'games.question': 'Optional question, e.g. "which move?"',
    'games.fair': 'Fair play: use the coach in solo, practice and learning games. Using it in ranked or online matches breaks most games\' rules.',
    'games.play': 'Play with Kairo', 'games.ttt': 'Tic-Tac-Toe', 'games.c4': 'Connect Four', 'games.aiplays': 'Kairo plays my move', 'games.reset': 'New game',
    'games.youwin': 'You win!', 'games.aiwins': 'Kairo wins.', 'games.draw': 'Draw.', 'games.yourturn': 'Your turn', 'games.showEarth': 'Show on Earth', 'games.confidence': 'Confidence',
    'files.pick': 'Choose folder', 'files.ask': 'Ask Kairo about this folder', 'files.empty': 'Pick a folder and Kairo can tell you what\'s inside, find things and explain files.', 'files.open': 'Open',
    'phone.title': 'Phone remote', 'phone.sub': 'Scan the QR code with your phone (same Wi-Fi). Then you can chat with Kairo, see your screen, lock the PC or control the volume.',
    'phone.start': 'Start phone remote', 'phone.stop': 'Stop', 'phone.reset': 'New secret link', 'phone.wol': 'Turn the PC on from your phone?',
    'phone.wolText': 'A PC that is off can\'t run Kairo, so it can\'t wake itself. Use Wake-on-LAN: enable it in BIOS and the network adapter, then use a Wake-on-LAN app on your phone with this MAC address:',
    'phone.firewall': 'Windows may ask to allow Kairo through the firewall. Allow it for private networks only.', 'phone.activity': 'Activity',
    'set.profile': 'Profile', 'set.name': 'Assistant name', 'set.language': 'Language', 'set.persona': 'Personality', 'set.custom': 'Your own instructions',
    'set.ai': 'AI', 'set.provider': 'Provider', 'set.key': 'API key', 'set.getKey': 'Get a key', 'set.model': 'Model', 'set.loadModels': 'Load models', 'set.baseUrl': 'Server URL',
    'set.look': 'Look', 'set.theme': 'Theme', 'set.accent': 'Accent colour', 'set.font': 'Font', 'set.motion': 'Animations', 'set.motion.off': 'Off', 'set.motion.subtle': 'Subtle', 'set.motion.full': 'Full', 'set.density': 'Density',
    'set.voice': 'Voice', 'set.engine': 'Voice engine', 'set.engine.system': 'Windows voices (free)', 'set.engine.openai': 'Natural voices (OpenAI)', 'set.autoSpeak': 'Read answers aloud', 'set.test': 'Test voice', 'set.rate': 'Speed',
    'set.privacy': 'Privacy & system', 'set.hide': 'Hide Kairo from its own screenshots', 'set.hotkey': 'Show / hide shortcut', 'set.saved': 'Saved',
    'set.voiceHint': 'Windows voices sound robotic. For natural voices pick OpenAI (needs an OpenAI key).'
  },
  de: {
    _name: 'Deutsch',
    'nav.chat': 'Chat', 'nav.earth': 'Erde', 'nav.games': 'Spiele', 'nav.files': 'Dateien', 'nav.phone': 'Handy', 'nav.settings': 'Einstellungen',
    'chat.placeholder': 'Frag mich was…  (Enter senden, Shift+Enter neue Zeile)',
    'chat.hello': 'Hey, ich bin {name}.', 'chat.sub': 'Ich kann deinen Bildschirm sehen, News lesen, die Erde zeigen und dir bei Games helfen.',
    'chat.s1': 'Was ist gerade auf meinem Bildschirm?', 'chat.s2': 'Was ist heute so passiert?', 'chat.s3': 'Zeig mir die Erde', 'chat.s4': 'Welche KI ist am besten fürs Programmieren? Sei fair.',
    'chat.new': 'Neuer Chat', 'chat.copy': 'Kopieren', 'chat.speak': 'Vorlesen', 'chat.sources': 'Quellen',
    'chip.screen': 'Bildschirm', 'chip.news': 'News', 'chip.folder': 'Ordner',
    'status.screen': 'Schaue auf deinen Bildschirm…', 'status.news': 'Lese die News…', 'status.thinking': 'Denke nach…', 'status.listening': 'Höre zu…',
    'err.nokey': 'Für diesen Anbieter fehlt noch ein API-Key. Trag ihn unter Einstellungen → KI ein.', 'err.generic': 'Da ging was schief:',
    'mode.label': 'Modus',
    'persona.normal': 'Normal', 'persona.bro': 'Bro', 'persona.lockin': 'Lock-in', 'persona.mentor': 'Mentor', 'persona.butler': 'Butler',
    'lockin.timer': 'Fokus', 'lockin.done': 'Fokus-Block fertig. Mach 5 Minuten Pause.',
    'earth.search': 'Ort suchen…', 'earth.what': 'Was ist hier passiert?', 'earth.satellite': 'Satellit', 'earth.rotate': 'Drehen', 'earth.night': 'Nachtlichter',
    'earth.pick': 'Klick irgendwo auf die Erde.', 'earth.loading': 'Lädt…', 'earth.ask': 'Im Chat fragen',
    'games.coach': 'Game-Coach', 'games.coachSub': 'Kairo schaut auf dein Spiel und gibt dir Tipps. Spiel auswählen, Spiel öffnen, dann Analysieren drücken.',
    'games.analyze': 'Bildschirm analysieren', 'games.watch': 'Automatisch alle 20 s', 'games.overlay': 'Overlay über dem Spiel',
    'games.question': 'Optionale Frage, z. B. „welcher Zug?"',
    'games.fair': 'Fair Play: Nutz den Coach in Solo-, Übungs- und Lernspielen. In Ranked- oder Online-Matches verstößt das gegen die Regeln der meisten Spiele.',
    'games.play': 'Spiel gegen Kairo', 'games.ttt': 'Tic-Tac-Toe', 'games.c4': 'Vier gewinnt', 'games.aiplays': 'Kairo spielt für mich', 'games.reset': 'Neues Spiel',
    'games.youwin': 'Du hast gewonnen!', 'games.aiwins': 'Kairo gewinnt.', 'games.draw': 'Unentschieden.', 'games.yourturn': 'Du bist dran', 'games.showEarth': 'Auf der Erde zeigen', 'games.confidence': 'Sicherheit',
    'files.pick': 'Ordner wählen', 'files.ask': 'Kairo zu diesem Ordner fragen', 'files.empty': 'Wähl einen Ordner und Kairo sagt dir, was drin ist, findet Sachen und erklärt Dateien.', 'files.open': 'Öffnen',
    'phone.title': 'Handy-Fernbedienung', 'phone.sub': 'Scanne den QR-Code mit dem Handy (gleiches WLAN). Dann kannst du mit Kairo chatten, deinen Bildschirm sehen, den PC sperren oder die Lautstärke steuern.',
    'phone.start': 'Handy-Fernbedienung starten', 'phone.stop': 'Stoppen', 'phone.reset': 'Neuer geheimer Link', 'phone.wol': 'PC vom Handy aus einschalten?',
    'phone.wolText': 'Ein ausgeschalteter PC kann Kairo nicht ausführen, also kann er sich nicht selbst aufwecken. Nutze Wake-on-LAN: im BIOS und beim Netzwerkadapter aktivieren, dann eine Wake-on-LAN-App auf dem Handy mit dieser MAC-Adresse:',
    'phone.firewall': 'Windows fragt eventuell nach der Firewall. Nur für private Netzwerke erlauben.', 'phone.activity': 'Aktivität',
    'set.profile': 'Profil', 'set.name': 'Name des Assistenten', 'set.language': 'Sprache', 'set.persona': 'Persönlichkeit', 'set.custom': 'Eigene Anweisungen',
    'set.ai': 'KI', 'set.provider': 'Anbieter', 'set.key': 'API-Key', 'set.getKey': 'Key holen', 'set.model': 'Modell', 'set.loadModels': 'Modelle laden', 'set.baseUrl': 'Server-URL',
    'set.look': 'Aussehen', 'set.theme': 'Theme', 'set.accent': 'Akzentfarbe', 'set.font': 'Schrift', 'set.motion': 'Animationen', 'set.motion.off': 'Aus', 'set.motion.subtle': 'Dezent', 'set.motion.full': 'Voll', 'set.density': 'Dichte',
    'set.voice': 'Stimme', 'set.engine': 'Stimmen-Engine', 'set.engine.system': 'Windows-Stimmen (gratis)', 'set.engine.openai': 'Natürliche Stimmen (OpenAI)', 'set.autoSpeak': 'Antworten vorlesen', 'set.test': 'Stimme testen', 'set.rate': 'Tempo',
    'set.privacy': 'Privatsphäre & System', 'set.hide': 'Kairo auf eigenen Screenshots verstecken', 'set.hotkey': 'Tastenkürzel ein-/ausblenden', 'set.saved': 'Gespeichert',
    'set.voiceHint': 'Windows-Stimmen klingen robotisch. Für natürliche Stimmen OpenAI wählen (braucht OpenAI-Key).'
  },
  sq: {
    _name: 'Shqip',
    'nav.chat': 'Bisedë', 'nav.earth': 'Toka', 'nav.games': 'Lojëra', 'nav.files': 'Skedarë', 'nav.phone': 'Telefoni', 'nav.settings': 'Cilësimet',
    'chat.placeholder': 'Më pyet çfarëdo…  (Enter dërgo, Shift+Enter rresht i ri)',
    'chat.hello': 'Përshëndetje, unë jam {name}.', 'chat.sub': 'Mund të shoh ekranin, të lexoj lajmet, të tregoj Tokën dhe të të ndihmoj në lojëra.',
    'chat.s1': 'Çfarë ka në ekranin tim tani?', 'chat.s2': 'Çfarë ka ndodhur sot?', 'chat.s3': 'Më trego Tokën', 'chat.s4': 'Cila AI është më e mira për programim? Ji i drejtë.',
    'chat.new': 'Bisedë e re', 'chat.copy': 'Kopjo', 'chat.speak': 'Lexo me zë', 'chat.sources': 'Burimet',
    'chip.screen': 'Ekrani', 'chip.news': 'Lajme', 'chip.folder': 'Dosja',
    'status.screen': 'Po shoh ekranin…', 'status.news': 'Po lexoj lajmet…', 'status.thinking': 'Po mendoj…', 'status.listening': 'Po dëgjoj…',
    'err.nokey': 'Mungon çelësi API për këtë ofrues. Shtoje te Cilësimet → AI.', 'err.generic': 'Diçka shkoi keq:',
    'mode.label': 'Modaliteti',
    'persona.normal': 'Normal', 'persona.bro': 'Vëlla', 'persona.lockin': 'Fokus', 'persona.mentor': 'Mentor', 'persona.butler': 'Shërbyes',
    'lockin.timer': 'Fokus', 'lockin.done': 'Blloku i fokusit mbaroi. Bëj 5 minuta pushim.',
    'earth.search': 'Kërko një vend…', 'earth.what': 'Çfarë ka ndodhur këtu?', 'earth.satellite': 'Satelit', 'earth.rotate': 'Rrotullo', 'earth.night': 'Dritat e natës',
    'earth.pick': 'Kliko diku në Tokë.', 'earth.loading': 'Duke u ngarkuar…', 'earth.ask': 'Pyet në bisedë',
    'games.coach': 'Trajneri i lojërave', 'games.coachSub': 'Kairo shikon lojën dhe të jep këshilla. Zgjidh lojën, hape, pastaj shtyp Analizo.',
    'games.analyze': 'Analizo ekranin', 'games.watch': 'Automatik çdo 20 s', 'games.overlay': 'Mbivendosje mbi lojë',
    'games.question': 'Pyetje opsionale, p.sh. "cila lëvizje?"',
    'games.fair': 'Lojë e ndershme: përdore trajnerin në lojëra solo dhe stërvitje. Në ndeshje online ose të renditura shkel rregullat.',
    'games.play': 'Luaj me Kairo', 'games.ttt': 'Tic-Tac-Toe', 'games.c4': 'Katër me radhë', 'games.aiplays': 'Kairo luan për mua', 'games.reset': 'Lojë e re',
    'games.youwin': 'Fitove!', 'games.aiwins': 'Fitoi Kairo.', 'games.draw': 'Barazim.', 'games.yourturn': 'Radha jote', 'games.showEarth': 'Trego në Tokë', 'games.confidence': 'Siguria',
    'files.pick': 'Zgjidh dosjen', 'files.ask': 'Pyet Kairo për këtë dosje', 'files.empty': 'Zgjidh një dosje dhe Kairo të tregon çfarë ka brenda.', 'files.open': 'Hap',
    'phone.title': 'Telekomanda me telefon', 'phone.sub': 'Skano kodin QR me telefon (i njëjti Wi-Fi). Pastaj mund të bisedosh, të shohësh ekranin, ta kyçësh PC-në ose të ndryshosh zërin.',
    'phone.start': 'Nis telekomandën', 'phone.stop': 'Ndalo', 'phone.reset': 'Link i ri sekret', 'phone.wol': 'Ta ndez PC-në nga telefoni?',
    'phone.wolText': 'Një PC i fikur nuk mund të ndezë veten. Përdor Wake-on-LAN: aktivizoje në BIOS dhe te karta e rrjetit, pastaj një aplikacion Wake-on-LAN me këtë adresë MAC:',
    'phone.firewall': 'Windows mund të pyesë për firewall-in. Lejoje vetëm për rrjete private.', 'phone.activity': 'Aktiviteti',
    'set.profile': 'Profili', 'set.name': 'Emri i asistentit', 'set.language': 'Gjuha', 'set.persona': 'Personaliteti', 'set.custom': 'Udhëzimet e tua',
    'set.ai': 'AI', 'set.provider': 'Ofruesi', 'set.key': 'Çelësi API', 'set.getKey': 'Merr çelës', 'set.model': 'Modeli', 'set.loadModels': 'Ngarko modelet', 'set.baseUrl': 'URL e serverit',
    'set.look': 'Pamja', 'set.theme': 'Tema', 'set.accent': 'Ngjyra kryesore', 'set.font': 'Shkronjat', 'set.motion': 'Animacionet', 'set.motion.off': 'Fikur', 'set.motion.subtle': 'E lehtë', 'set.motion.full': 'E plotë', 'set.density': 'Dendësia',
    'set.voice': 'Zëri', 'set.engine': 'Motori i zërit', 'set.engine.system': 'Zërat e Windows (falas)', 'set.engine.openai': 'Zëra natyralë (OpenAI)', 'set.autoSpeak': 'Lexo përgjigjet me zë', 'set.test': 'Testo zërin', 'set.rate': 'Shpejtësia',
    'set.privacy': 'Privatësia & sistemi', 'set.hide': 'Fshihe Kairo nga pamjet e veta të ekranit', 'set.hotkey': 'Shkurtorja shfaq/fshih', 'set.saved': 'U ruajt',
    'set.voiceHint': 'Zërat e Windows tingëllojnë si robot. Për zëra natyralë zgjidh OpenAI.'
  },
  fr: {
    _name: 'Français',
    'nav.chat': 'Chat', 'nav.earth': 'Terre', 'nav.games': 'Jeux', 'nav.files': 'Fichiers', 'nav.phone': 'Téléphone', 'nav.settings': 'Réglages',
    'chat.placeholder': 'Demande-moi n\'importe quoi…', 'chat.hello': 'Salut, je suis {name}.', 'chat.sub': 'Je peux voir ton écran, lire l\'actu, explorer la Terre et t\'aider dans tes jeux.',
    'chat.s1': 'Qu\'y a-t-il sur mon écran ?', 'chat.s2': 'Qu\'est-ce qui s\'est passé aujourd\'hui ?', 'chat.s3': 'Montre-moi la Terre', 'chat.s4': 'Quelle IA est la meilleure pour coder ? Sois honnête.',
    'chat.new': 'Nouveau chat', 'chat.copy': 'Copier', 'chat.speak': 'Lire', 'chat.sources': 'Sources', 'chip.screen': 'Écran', 'chip.news': 'Actu', 'chip.folder': 'Dossier',
    'status.screen': 'Je regarde ton écran…', 'status.news': 'Je lis l\'actu…', 'status.thinking': 'Je réfléchis…', 'status.listening': 'J\'écoute…',
    'err.nokey': 'Pas encore de clé API pour ce fournisseur. Ajoute-la dans Réglages → IA.', 'err.generic': 'Un problème est survenu :', 'mode.label': 'Mode',
    'earth.search': 'Chercher un lieu…', 'earth.what': 'Que s\'est-il passé ici ?', 'earth.satellite': 'Satellite', 'earth.rotate': 'Rotation', 'earth.night': 'Lumières de nuit', 'earth.pick': 'Clique n\'importe où sur la Terre.', 'earth.ask': 'Demander dans le chat',
    'games.coach': 'Coach de jeu', 'games.analyze': 'Analyser l\'écran', 'games.play': 'Jouer avec Kairo', 'games.c4': 'Puissance 4', 'games.reset': 'Nouvelle partie', 'games.youwin': 'Tu as gagné !', 'games.aiwins': 'Kairo gagne.', 'games.draw': 'Égalité.',
    'files.pick': 'Choisir un dossier', 'files.ask': 'Demander à Kairo sur ce dossier', 'phone.title': 'Télécommande mobile', 'phone.start': 'Démarrer', 'phone.stop': 'Arrêter',
    'set.profile': 'Profil', 'set.language': 'Langue', 'set.persona': 'Personnalité', 'set.ai': 'IA', 'set.look': 'Apparence', 'set.theme': 'Thème', 'set.accent': 'Couleur d\'accent', 'set.voice': 'Voix', 'set.privacy': 'Confidentialité & système', 'set.saved': 'Enregistré'
  },
  es: {
    _name: 'Español',
    'nav.chat': 'Chat', 'nav.earth': 'Tierra', 'nav.games': 'Juegos', 'nav.files': 'Archivos', 'nav.phone': 'Móvil', 'nav.settings': 'Ajustes',
    'chat.placeholder': 'Pregúntame lo que sea…', 'chat.hello': 'Hola, soy {name}.', 'chat.sub': 'Puedo ver tu pantalla, leer noticias, explorar la Tierra y ayudarte con tus juegos.',
    'chat.s1': '¿Qué hay en mi pantalla?', 'chat.s2': '¿Qué ha pasado hoy?', 'chat.s3': 'Muéstrame la Tierra', 'chat.s4': '¿Qué IA es la mejor para programar? Sé justo.',
    'chat.new': 'Nuevo chat', 'chat.copy': 'Copiar', 'chat.speak': 'Leer en voz alta', 'chat.sources': 'Fuentes', 'chip.screen': 'Pantalla', 'chip.news': 'Noticias', 'chip.folder': 'Carpeta',
    'status.screen': 'Mirando tu pantalla…', 'status.news': 'Leyendo noticias…', 'status.thinking': 'Pensando…', 'status.listening': 'Escuchando…',
    'err.nokey': 'Falta la clave API de este proveedor. Añádela en Ajustes → IA.', 'err.generic': 'Algo salió mal:', 'mode.label': 'Modo',
    'earth.search': 'Buscar un lugar…', 'earth.what': '¿Qué pasó aquí?', 'earth.satellite': 'Satélite', 'earth.rotate': 'Girar', 'earth.night': 'Luces nocturnas', 'earth.pick': 'Haz clic en cualquier parte de la Tierra.', 'earth.ask': 'Preguntar en el chat',
    'games.coach': 'Entrenador de juegos', 'games.analyze': 'Analizar pantalla', 'games.play': 'Juega con Kairo', 'games.c4': 'Conecta 4', 'games.reset': 'Nueva partida', 'games.youwin': '¡Ganaste!', 'games.aiwins': 'Gana Kairo.', 'games.draw': 'Empate.',
    'files.pick': 'Elegir carpeta', 'files.ask': 'Preguntar a Kairo sobre esta carpeta', 'phone.title': 'Control desde el móvil', 'phone.start': 'Iniciar', 'phone.stop': 'Detener',
    'set.profile': 'Perfil', 'set.language': 'Idioma', 'set.persona': 'Personalidad', 'set.ai': 'IA', 'set.look': 'Aspecto', 'set.theme': 'Tema', 'set.accent': 'Color de acento', 'set.voice': 'Voz', 'set.privacy': 'Privacidad y sistema', 'set.saved': 'Guardado'
  },
  it: {
    _name: 'Italiano',
    'nav.chat': 'Chat', 'nav.earth': 'Terra', 'nav.games': 'Giochi', 'nav.files': 'File', 'nav.phone': 'Telefono', 'nav.settings': 'Impostazioni',
    'chat.placeholder': 'Chiedimi qualsiasi cosa…', 'chat.hello': 'Ciao, sono {name}.', 'chat.sub': 'Posso vedere il tuo schermo, leggere le notizie, esplorare la Terra e aiutarti nei giochi.',
    'chat.s1': 'Cosa c\'è sul mio schermo?', 'chat.s2': 'Cosa è successo oggi?', 'chat.s3': 'Mostrami la Terra', 'chat.s4': 'Qual è la migliore IA per programmare? Sii onesto.',
    'chat.new': 'Nuova chat', 'chat.copy': 'Copia', 'chat.speak': 'Leggi ad alta voce', 'chat.sources': 'Fonti', 'chip.screen': 'Schermo', 'chip.news': 'Notizie', 'chip.folder': 'Cartella',
    'status.screen': 'Guardo il tuo schermo…', 'status.news': 'Leggo le notizie…', 'status.thinking': 'Sto pensando…', 'status.listening': 'Ascolto…',
    'err.nokey': 'Manca la chiave API per questo provider. Aggiungila in Impostazioni → IA.', 'err.generic': 'Qualcosa è andato storto:', 'mode.label': 'Modalità',
    'earth.search': 'Cerca un luogo…', 'earth.what': 'Cosa è successo qui?', 'earth.satellite': 'Satellite', 'earth.rotate': 'Ruota', 'earth.night': 'Luci notturne', 'earth.pick': 'Clicca ovunque sulla Terra.', 'earth.ask': 'Chiedi in chat',
    'games.coach': 'Coach di gioco', 'games.analyze': 'Analizza schermo', 'games.play': 'Gioca con Kairo', 'games.c4': 'Forza 4', 'games.reset': 'Nuova partita', 'games.youwin': 'Hai vinto!', 'games.aiwins': 'Vince Kairo.', 'games.draw': 'Pareggio.',
    'files.pick': 'Scegli cartella', 'files.ask': 'Chiedi a Kairo su questa cartella', 'phone.title': 'Telecomando dal telefono', 'phone.start': 'Avvia', 'phone.stop': 'Ferma',
    'set.profile': 'Profilo', 'set.language': 'Lingua', 'set.persona': 'Personalità', 'set.ai': 'IA', 'set.look': 'Aspetto', 'set.theme': 'Tema', 'set.accent': 'Colore accento', 'set.voice': 'Voce', 'set.privacy': 'Privacy e sistema', 'set.saved': 'Salvato'
  },
  tr: {
    _name: 'Türkçe',
    'nav.chat': 'Sohbet', 'nav.earth': 'Dünya', 'nav.games': 'Oyunlar', 'nav.files': 'Dosyalar', 'nav.phone': 'Telefon', 'nav.settings': 'Ayarlar',
    'chat.placeholder': 'Bana her şeyi sor…', 'chat.hello': 'Selam, ben {name}.', 'chat.sub': 'Ekranını görebilir, haberleri okuyabilir, Dünya\'yı gösterebilir ve oyunlarda yardım edebilirim.',
    'chat.s1': 'Şu an ekranımda ne var?', 'chat.s2': 'Bugün neler oldu?', 'chat.s3': 'Bana Dünya\'yı göster', 'chat.s4': 'Kodlama için en iyi yapay zeka hangisi? Adil ol.',
    'chat.new': 'Yeni sohbet', 'chat.copy': 'Kopyala', 'chat.speak': 'Sesli oku', 'chat.sources': 'Kaynaklar', 'chip.screen': 'Ekran', 'chip.news': 'Haberler', 'chip.folder': 'Klasör',
    'status.screen': 'Ekranına bakıyorum…', 'status.news': 'Haberleri okuyorum…', 'status.thinking': 'Düşünüyorum…', 'status.listening': 'Dinliyorum…',
    'err.nokey': 'Bu sağlayıcı için API anahtarı yok. Ayarlar → Yapay zeka bölümünden ekle.', 'err.generic': 'Bir şeyler ters gitti:', 'mode.label': 'Mod',
    'earth.search': 'Bir yer ara…', 'earth.what': 'Burada ne oldu?', 'earth.satellite': 'Uydu', 'earth.rotate': 'Döndür', 'earth.night': 'Gece ışıkları', 'earth.pick': 'Dünya\'da herhangi bir yere tıkla.', 'earth.ask': 'Sohbette sor',
    'games.coach': 'Oyun koçu', 'games.analyze': 'Ekranı analiz et', 'games.play': 'Kairo ile oyna', 'games.c4': 'Dört Bağla', 'games.reset': 'Yeni oyun', 'games.youwin': 'Kazandın!', 'games.aiwins': 'Kairo kazandı.', 'games.draw': 'Berabere.',
    'files.pick': 'Klasör seç', 'files.ask': 'Bu klasörü Kairo\'ya sor', 'phone.title': 'Telefon kumandası', 'phone.start': 'Başlat', 'phone.stop': 'Durdur',
    'set.profile': 'Profil', 'set.language': 'Dil', 'set.persona': 'Kişilik', 'set.ai': 'Yapay zeka', 'set.look': 'Görünüm', 'set.theme': 'Tema', 'set.accent': 'Vurgu rengi', 'set.voice': 'Ses', 'set.privacy': 'Gizlilik ve sistem', 'set.saved': 'Kaydedildi'
  }
};

window.t = function (key, vars) {
  const lang = window.APP_LANG || 'en';
  let s = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', v);
  return s;
};

// Voice mode + new chat states
Object.assign(I18N.en, {
  'voice.idle': '', 'voice.connecting': 'Connecting…', 'voice.listening': 'Listening — just talk', 'voice.thinking': 'Thinking…', 'voice.speaking': 'Speaking',
  'voice.muted': 'Mic off', 'voice.error': 'Error', 'voice.noModel': 'No voice model available for this Gemini key.', 'voice.lost': 'Connection lost',
  'voice.needGemini': 'Voice mode uses Gemini Live. Add a free Gemini key in Settings → AI.', 'voice.noMic': 'No microphone access.',
  'voice.hint': 'Just talk. "Look at my screen" · "Where is this?" · "What happened today?" · "Show me Tirana" · Esc ends',
  'status.retry': 'Model is busy, switching to a faster one…', 'status.where': 'Looking for clues on your screen…',
  'set.orb': 'Orb style', 'set.orbColors': 'Orb colours', 'set.geminiVoice': 'Voice', 'set.voiceHotkey': 'Voice mode shortcut',
  'set.engine.auto': 'Automatic (best available)', 'set.engine.gemini': 'Natural voices (Gemini)',
  'set.voiceHint': 'Voice mode (mic button) talks with natural Gemini voices. For reading answers aloud, Gemini or OpenAI sound natural; Windows voices sound robotic.',
  'chat.voice': 'Talk'
});
Object.assign(I18N.de, {
  'voice.idle': '', 'voice.connecting': 'Verbinde…', 'voice.listening': 'Ich höre zu — sprich einfach', 'voice.thinking': 'Denke nach…', 'voice.speaking': 'Spreche',
  'voice.muted': 'Mikro aus', 'voice.error': 'Fehler', 'voice.noModel': 'Für diesen Gemini-Key gibt es kein Sprachmodell.', 'voice.lost': 'Verbindung verloren',
  'voice.needGemini': 'Der Sprachmodus nutzt Gemini Live. Trag einen (gratis) Gemini-Key unter Einstellungen → KI ein.', 'voice.noMic': 'Kein Zugriff aufs Mikrofon.',
  'voice.hint': 'Sprich einfach. „Schau auf meinen Bildschirm" · „Wo ist das?" · „Was ist heute passiert?" · „Zeig mir Tirana" · Esc beendet',
  'status.retry': 'Modell ist überlastet, wechsle zu einem schnelleren…', 'status.where': 'Suche Hinweise auf deinem Bildschirm…',
  'set.orb': 'Orb-Stil', 'set.orbColors': 'Orb-Farben', 'set.geminiVoice': 'Stimme', 'set.voiceHotkey': 'Tastenkürzel Sprachmodus',
  'set.engine.auto': 'Automatisch (beste verfügbare)', 'set.engine.gemini': 'Natürliche Stimmen (Gemini)',
  'set.voiceHint': 'Der Sprachmodus (Mikro-Knopf) redet mit natürlichen Gemini-Stimmen. Fürs Vorlesen klingen Gemini oder OpenAI natürlich, Windows-Stimmen robotisch.',
  'chat.voice': 'Sprechen'
});
Object.assign(I18N.sq, {
  'voice.connecting': 'Po lidhem…', 'voice.listening': 'Po dëgjoj — thjesht fol', 'voice.thinking': 'Po mendoj…', 'voice.speaking': 'Po flas',
  'voice.muted': 'Mikrofoni i fikur', 'voice.lost': 'Lidhja u ndërpre', 'voice.noMic': 'Nuk ka qasje në mikrofon.',
  'voice.needGemini': 'Modaliteti i zërit përdor Gemini Live. Shto një çelës Gemini falas te Cilësimet → AI.',
  'voice.hint': 'Thjesht fol. „Shiko ekranin tim" · „Ku është kjo?" · „Çfarë ka ndodhur sot?" · „Më trego Tiranën" · Esc mbyll',
  'status.retry': 'Modeli është i ngarkuar, po kaloj te një më i shpejtë…', 'status.where': 'Po kërkoj të dhëna në ekranin tënd…',
  'set.orb': 'Stili i orbit', 'set.orbColors': 'Ngjyrat e orbit', 'set.geminiVoice': 'Zëri', 'chat.voice': 'Fol'
});

Object.assign(I18N.en, { 'home.tap': 'Tap to talk', 'chat.s5': 'Open YouTube and play lo-fi music', 'chat.s6': 'Write me a Word document about the solar system',
  'file.writing': 'writing', 'file.chars': 'characters', 'file.folder': 'Show in folder' });
Object.assign(I18N.de, { 'home.tap': 'Tippen zum Sprechen', 'chat.s5': 'Öffne YouTube und spiel Lo-Fi Musik', 'chat.s6': 'Schreib mir ein Word-Dokument über das Sonnensystem',
  'file.writing': 'schreibe', 'file.chars': 'Zeichen', 'file.folder': 'Im Ordner zeigen' });
Object.assign(I18N.sq, { 'home.tap': 'Prek për të folur', 'chat.s5': 'Hap YouTube dhe luaj muzikë lo-fi', 'chat.s6': 'Më shkruaj një dokument Word për sistemin diellor',
  'file.writing': 'po shkruaj', 'file.chars': 'shkronja', 'file.folder': 'Shfaq në dosje' });

Object.assign(I18N.en, { 'games.chess': 'Chess', 'chess.white': 'White', 'chess.black': 'Black', 'chess.hint': 'Hint', 'chess.auto': 'Kairo vs Kairo',
  'chess.explain': 'Explain', 'chess.check': 'Check!', 'chess.l1': 'Beginner', 'chess.l2': 'Casual', 'chess.l3': 'Club player', 'chess.l4': 'Expert', 'chess.l5': 'Grandmaster',
  'chess.explainQ': 'Explain this chess position simply: who stands better, what are the plans for both sides, and what should I play next?' });
Object.assign(I18N.de, { 'games.chess': 'Schach', 'chess.white': 'Weiss', 'chess.black': 'Schwarz', 'chess.hint': 'Tipp', 'chess.auto': 'Kairo gegen Kairo',
  'chess.explain': 'Erklären', 'chess.check': 'Schach!', 'chess.l1': 'Anfänger', 'chess.l2': 'Hobby', 'chess.l3': 'Vereinsspieler', 'chess.l4': 'Experte', 'chess.l5': 'Grossmeister',
  'chess.explainQ': 'Erklär mir diese Schachstellung einfach: Wer steht besser, was sind die Pläne für beide Seiten, und was soll ich als Nächstes spielen?' });
Object.assign(I18N.sq, { 'games.chess': 'Shah', 'chess.white': 'Bardhë', 'chess.black': 'Zi', 'chess.hint': 'Ndihmë', 'chess.auto': 'Kairo kundër Kairo',
  'chess.explain': 'Shpjego', 'chess.check': 'Shah!', 'chess.l1': 'Fillestar', 'chess.l2': 'Hobi', 'chess.l3': 'Lojtar klubi', 'chess.l4': 'Ekspert', 'chess.l5': 'Mjeshtër i madh',
  'chess.explainQ': 'Më shpjego thjesht këtë pozicion shahu: kush qëndron më mirë, cilat janë planet dhe çfarë duhet të luaj?' });

Object.assign(I18N.en, { 'hf.label': 'Hands-free', 'hf.desc': 'Listen right away — just say "Hey" (mic checked on this PC; nothing is sent until you speak)',
  'hf.sayHello': 'Just say "Hey"', 'hf.on': 'Hands-free on — just talk', 'hf.off': 'Hands-free off', 'hf.sens': 'Mic sensitivity', 'hf.low': 'Low', 'hf.medium': 'Medium', 'hf.high': 'High' });
Object.assign(I18N.de, { 'hf.label': 'Hände frei', 'hf.desc': 'Sofort zuhören — sag einfach „Hallo" (Mikro wird nur auf dem PC geprüft; gesendet wird erst, wenn du sprichst)',
  'hf.sayHello': 'Sag einfach „Hallo"', 'hf.on': 'Hände frei an — sprich einfach', 'hf.off': 'Hände frei aus', 'hf.sens': 'Mikro-Empfindlichkeit', 'hf.low': 'Niedrig', 'hf.medium': 'Mittel', 'hf.high': 'Hoch' });
Object.assign(I18N.sq, { 'hf.label': 'Pa duar', 'hf.desc': 'Dëgjo menjëherë — thjesht thuaj „Përshëndetje"', 'hf.sayHello': 'Thjesht thuaj „Hej"',
  'hf.on': 'Pa duar aktiv — thjesht fol', 'hf.off': 'Pa duar joaktiv', 'hf.sens': 'Ndjeshmëria e mikrofonit', 'hf.low': 'E ulët', 'hf.medium': 'Mesatare', 'hf.high': 'E lartë' });
