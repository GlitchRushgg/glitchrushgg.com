// ============================================================================
//  HOTEL DINO BLU — Traducciones (es / en / it)
//  El idioma se elige en la pantalla de inicio (localStorage 'hg-lang') o se
//  detecta del navegador. Los estados de habitación se localizan: ES SALIDA/
//  ESTANCIA, EN CHECK-OUT/STAY-OVER, IT PARTENZA/FERMATA (su idioma original).
// ============================================================================

const DICTS = {
  // --------------------------------------------------------------- ESPAÑOL --
  es: {
    htmlTitle: 'Hotel Dino Blu — Turno de Limpieza 3D',
    sub: 'Praia a Mare · Calabria · frente a la Isola di Dino',
    story: `Eres <b>Sofía</b>, camarera de pisos de un hotel junto al mar. Limpia las
        <b>habitaciones de tu piso</b> antes de las <b>14:00</b>. Tranquila: el juego te guía —
        sigue el <b>letrero dorado</b> de arriba y la <b>flecha dorada ▼</b>.`,
    manualTitle: '📋 Manual de la camarera',
    manual: [
      `🔴 <b>SALIDA</b> (el huésped se va): cambio <b>completo</b> — retirar toda la ropa,
        sábanas nuevas, baño a fondo, toallas nuevas, suelo, papelera y cortesías.`,
      `🔵 <b>ESTANCIA</b> (el huésped se queda): repaso diario — hacer la cama, repasar el baño,
        cambiar toallas, papelera y suelo. Las <b>sábanas se cambian cada 3 noches</b>.`,
      `🧺 <b>Toallas por habitación</b>: por cada huésped <b>1 grande + 1 de bidet + 1 pequeña</b>,
        más <b>1 alfombrín</b> para el suelo del baño.`,
      `👜 Tu carro lleva una cantidad limitada: baja en ascensor a la <b>lavandería (P-1)</b>
        a entregar la ropa sucia y reponer la limpia.`,
      `👩‍💼 Lucía inspecciona las habitaciones terminadas. Tres fallos y… ¡jornada arruinada!`,
    ],
    controlsTitle: '🎮 Controles',
    desktopHelp: `Ratón para mirar · <b>W A S D</b> / flechas para moverte ·
        mantén <b>E</b> para realizar tareas · <b>Shift</b> para correr`,
    touchHelp: `Joystick izquierdo para moverte · arrastra la pantalla para mirar ·
        mantén pulsado el botón ✋ para realizar tareas`,
    start: '🧹 Empezar el turno',
    castTitle: '👭 El equipo del Hotel Dino Blu',
    cast: [
      { img: 'sofia', name: 'Sofía', role: 'Tú · 2º piso' },
      { img: 'anna', name: 'Anna', role: '1º piso' },
      { img: 'giulia', name: 'Giulia', role: '3º piso' },
      { img: 'marco', name: 'Marco', role: '4º piso' },
      { img: 'carmela', name: 'Carmela', role: 'Lavandería' },
    ],

    tasks: {
      strip: 'Retirar ropa usada', bedC: 'Cambiar sábanas', bed: 'Hacer la cama',
      bath: 'Limpiar baño a fondo', bathQ: 'Repasar el baño', towels: 'Reponer toallas',
      trash: 'Vaciar papelera', floor: 'Fregar el suelo', amen: 'Reponer cortesías',
    },
    inv: {
      sabanas: '🛏 Juegos sábanas', grandes: '🧖 T. grandes', bidet: '🚿 T. bidet',
      pequenas: '🤲 T. pequeñas', alfombrin: '🦶 Alfombrines', cortesia: '🧴 Cortesías',
    },
    cartTitle: '🛒 TU CARRO',
    dirtyLabel: '🧺 Ropa sucia', heavy: ' (¡pesa!)',
    paceOk: 'Ritmo ✅', paceBad: 'Ritmo ⚠️ ¡date prisa!',

    partenza: 'SALIDA', fermata: 'ESTANCIA', libre: 'LIBRE', hecha: '✔ HECHA',
    roomTitle: n => `Habitación ${n}`,
    partenzaFull: '🔴 SALIDA — cambio completo',
    fermataNight: n => `🔵 ESTANCIA — noche ${n}`,
    sheetDue: ' · ¡toca cambio de sábanas!',
    guests: n => `${n} huésped${n > 1 ? 'es' : ''}`,
    nightShort: n => ` · noche ${n}`,
    sheetChangeCard: '¡cambio de sábanas!',
    towelHint: n => `🧖 Toallas: ${n} grande${n > 1 ? 's' : ''} · ${n} bidet · ${n} pequeña${n > 1 ? 's' : ''} · 1 alfombrín`,

    blockedSheets: '⚠ Sin sábanas limpias — baja a la lavandería (P-1)',
    blockedAmen: '⚠ Sin cortesías — repón el carro en la lavandería',
    blockedTowels: '⚠ Sin toallas — baja a la lavandería (P-1)',

    roomDone: (num, bonus) => `✨ ¡Habitación ${num} lista! (+${bonus})`,
    towelPerfect: '🧖 ¡Juego de toallas perfecto! (+30)',
    towelWrong: '🤔 Hmm… no parece la cantidad correcta. Esperemos que Lucía no lo note…',
    carmelaThanks: (n, p) => `🧺 Carmela: "¡Grazie! ${n} piezas a lavar." (+${p})`,
    cartRefilled: '🧖 Carro repuesto: sábanas y toallas limpias y planchadas ✨',
    noDirty: 'No llevas ropa sucia', cartFull: 'El carro ya está lleno',
    deliverDirty: '🧺 Entregar la ropa sucia',
    refillCart: '🧖 Reponer el carro con lencería limpia',
    callLift: 'Llamar al ascensor',
    exitDoor: 'Salir a la calle',
    exitMsg: '🚪 ¡No puedes irte en mitad del turno! Lucía te está mirando… 👀',

    liftTitle: '🛗 Ascensor de servicio', liftMeta: '¿A qué planta vas?', close: 'Cerrar',
    floors: {
      '-1': 'P-1 · Lavandería 🧺', 0: 'PB · Recepción 🛎', 1: 'Piso 1 · Anna',
      2: 'Piso 2 · TU PISO 🧹', 3: 'Piso 3 · Giulia', 4: 'Piso 4 · Martina',
    },
    toastLaundry: '🧺 Lavandería: 5 lavadoras y 2 secadoras a pleno rendimiento.',
    toastLobby: '🛎 Recepción del Hotel Dino Blu. ¡La piazzetta y el mar están ahí fuera!',
    toastMyFloor: '🧹 Tu piso. ¡A por esas habitaciones!',
    toastStart: '🧹 ¡Buenos días, Sofía! Empieza por las habitaciones de SALIDA: los nuevos huéspedes llegan a las 14:00.',

    luciaBad: (num, g, w) => `👩‍💼 Lucía: «¡Sofía! Las toallas de la ${num} NO están bien. ${g} huéspedes: ${g} grandes, ${g} de bidet, ${g} pequeñas y 1 alfombrín.» (fallo ${w}/3)`,
    luciaGood: num => `👩‍💼 Lucía: «La ${num} está perfecta, brava Sofía.» (+30)`,

    towelDlgTitle: num => `🧺 Reponer toallas — Hab. ${num}`,
    towelDlgMeta: (g, st) => `${g} · ${st} — ¿cuántas dejas de cada?`,
    towelItems: {
      grandes: '🧖 Toallas grandes', bidet: '🚿 Toallas de bidet',
      pequenas: '🤲 Toallas pequeñas', alfombrin: '🦶 Alfombrín (suelo)',
    },
    youHave: n => `tienes ${n}`,
    placeTowels: 'Colocar toallas', later: 'Mejor luego…',

    pressKey: ' — pulsa E', holdKey: ' — mantén E',
    pressTouch: ' — toca ✋', holdTouch: ' — mantén ✋',

    endTitles: {
      perfecto: '🎉 ¡Turno completado!',
      fin: '🕑 Son las 14:00 — fin del turno',
      despido: '😱 Lucía te manda a casa…',
    },
    endPerfect: (total, left) => `Has terminado las ${total} habitaciones${left ? ` con ${left} min de margen` : ''}. ¡Las compañeras te aplauden desde la lavandería!`,
    endTime: missing => missing <= 0 ? '¡Todo listo justo a tiempo!'
      : `Has dejado ${missing} habitación(es) sin terminar. Anna te echará una mano… esta vez.`,
    endFired: 'Tres fallos en las inspecciones. Mañana toca disculparse con un buen caffè en la piazzetta.',
    endRows: ['🛏 Habitaciones terminadas', '🧖 Juegos de toallas perfectos', '🧺 Viajes a la lavandería',
      '⚠️ Fallos / amonestaciones', '🕑 Hora de salida', '⭐ Puntuación final'],
    again: '🔁 Otro turno',

    sheetTitle: '🗒 Tu parte de trabajo — Piso 2',
    sheetCols: ['Hab.', 'Estado', 'Huéspedes', 'Noche', 'Sábanas'],
    sheetChange: 'CAMBIAR', sheetNo: 'no toca',

    signStairs: 'ESCALERAS', signOffice: 'OFFICE',
    signFloor: f => `PISO ${f}`,
    signLobby: 'PLANTA BAJA · RECEPCIÓN',
    signBasement: 'SÓTANO · LAVANDERÍA',
    signLaundry: '🧺 LAVANDERIA',
    signWashers: 'LAVADORAS · AQUA', signDryers: 'SECADORAS', signDirty: 'ROPA SUCIA',

    maidLabel: (n, f) => `${n} · ${f}º piso`,
    marcoLabel: 'Marco · 4º piso',
    carmelaLabel: 'Carmela · Lavandería',
    luciaLabel: 'Lucía · Gobernanta',

    objGoRoom: (num, st) => `Ve a la habitación <b>${num}</b> — ${st}`,
    objFollow: '✅ Haz las tareas de la lista (los iconos flotantes te las marcan)',
    objLaundry: '🛗 Te falta lencería: baja en el ascensor a la lavandería (P-1)',
    objGoFloor: '🛗 Ve al ascensor y sube a tu piso (el 2º)',
    objDeliver: '🧺 Dale la ropa sucia a Carmela (icono flotante)',
    objRefill: '🧖 Llena el carro en las estanterías (icono flotante)',
    objBackUp: '🛗 Carro listo: vuelve al ascensor y sube al 2º',
    tutMove: '🎮 Muévete con W A S D o las flechas',
    tutMoveTouch: '🎮 Muévete con el joystick de la izquierda',
    tutLook: '👀 Mueve el ratón para mirar (haz clic en la pantalla si no gira)',
    tutLookTouch: '👀 Arrastra la pantalla para mirar alrededor',
  },

  // --------------------------------------------------------------- ENGLISH --
  en: {
    htmlTitle: 'Hotel Dino Blu — Housekeeping Shift 3D',
    sub: 'Praia a Mare · Calabria · facing the Isola di Dino',
    story: `You are <b>Sofía</b>, a housekeeper at a seaside hotel. Clean the
        <b>rooms on your floor</b> before <b>14:00</b>. Don't worry: the game guides you —
        follow the <b>golden banner</b> at the top and the <b>golden arrow ▼</b>.`,
    manualTitle: '📋 Housekeeper’s manual',
    manual: [
      `🔴 <b>CHECK-OUT</b> (the guest leaves): <b>full</b> changeover — strip all the linen,
        fresh sheets, deep-clean the bathroom, new towels, floor, bin and amenities.`,
      `🔵 <b>STAY-OVER</b> (the guest stays): daily touch-up — make the bed, tidy the bathroom,
        change towels, bin and floor. <b>Sheets are changed every 3 nights</b>.`,
      `🧺 <b>Towels per room</b>: for each guest <b>1 bath + 1 bidet + 1 hand towel</b>,
        plus <b>1 bath mat</b> for the bathroom floor.`,
      `👜 Your cart only carries so much: take the lift down to the <b>laundry (B1)</b>
        to drop off dirty linen and restock clean linen.`,
      `👩‍💼 Lucía inspects finished rooms. Three strikes and… your shift is ruined!`,
    ],
    controlsTitle: '🎮 Controls',
    desktopHelp: `Mouse to look · <b>W A S D</b> / arrows to move ·
        hold <b>E</b> to do tasks · <b>Shift</b> to run`,
    touchHelp: `Left joystick to move · drag the screen to look ·
        press and hold the ✋ button to do tasks`,
    start: '🧹 Start the shift',
    castTitle: '👭 The Hotel Dino Blu team',
    cast: [
      { img: 'sofia', name: 'Sofía', role: 'You · Floor 2' },
      { img: 'anna', name: 'Anna', role: 'Floor 1' },
      { img: 'giulia', name: 'Giulia', role: 'Floor 3' },
      { img: 'marco', name: 'Marco', role: 'Floor 4' },
      { img: 'carmela', name: 'Carmela', role: 'Laundry' },
    ],

    tasks: {
      strip: 'Strip used linen', bedC: 'Change the sheets', bed: 'Make the bed',
      bath: 'Deep-clean bathroom', bathQ: 'Tidy the bathroom', towels: 'Restock towels',
      trash: 'Empty the bin', floor: 'Mop the floor', amen: 'Restock amenities',
    },
    inv: {
      sabanas: '🛏 Sheet sets', grandes: '🧖 Bath towels', bidet: '🚿 Bidet towels',
      pequenas: '🤲 Hand towels', alfombrin: '🦶 Bath mats', cortesia: '🧴 Amenities',
    },
    cartTitle: '🛒 YOUR CART',
    dirtyLabel: '🧺 Dirty linen', heavy: ' (heavy!)',
    paceOk: 'Pace ✅', paceBad: 'Pace ⚠️ hurry up!',

    partenza: 'CHECK-OUT', fermata: 'STAY-OVER', libre: 'VACANT', hecha: '✔ DONE',
    roomTitle: n => `Room ${n}`,
    partenzaFull: '🔴 CHECK-OUT — full changeover',
    fermataNight: n => `🔵 STAY-OVER — night ${n}`,
    sheetDue: ' · sheet change due!',
    guests: n => `${n} guest${n > 1 ? 's' : ''}`,
    nightShort: n => ` · night ${n}`,
    sheetChangeCard: 'sheet change!',
    towelHint: n => `🧖 Towels: ${n} bath · ${n} bidet · ${n} hand · 1 bath mat`,

    blockedSheets: '⚠ No clean sheets — go down to the laundry (B1)',
    blockedAmen: '⚠ No amenities — restock your cart in the laundry',
    blockedTowels: '⚠ No towels — go down to the laundry (B1)',

    roomDone: (num, bonus) => `✨ Room ${num} done! (+${bonus})`,
    towelPerfect: '🧖 Perfect towel set! (+30)',
    towelWrong: `🤔 Hmm… that doesn't look like the right amount. Let's hope Lucía doesn't notice…`,
    carmelaThanks: (n, p) => `🧺 Carmela: "Grazie! ${n} pieces to wash." (+${p})`,
    cartRefilled: '🧖 Cart restocked: clean, ironed sheets and towels ✨',
    noDirty: 'You have no dirty linen', cartFull: 'Your cart is already full',
    deliverDirty: '🧺 Drop off the dirty linen',
    refillCart: '🧖 Restock the cart with clean linen',
    callLift: 'Call the lift',
    exitDoor: 'Step outside',
    exitMsg: `🚪 You can't leave mid-shift! Lucía is watching you… 👀`,

    liftTitle: '🛗 Service lift', liftMeta: 'Which floor?', close: 'Close',
    floors: {
      '-1': 'B1 · Laundry 🧺', 0: 'GF · Reception 🛎', 1: 'Floor 1 · Anna',
      2: 'Floor 2 · YOUR FLOOR 🧹', 3: 'Floor 3 · Giulia', 4: 'Floor 4 · Martina',
    },
    toastLaundry: '🧺 Laundry: 5 washers and 2 dryers running at full steam.',
    toastLobby: '🛎 Hotel Dino Blu reception. The piazzetta and the sea are right outside!',
    toastMyFloor: '🧹 Your floor. Go get those rooms!',
    toastStart: '🧹 Good morning, Sofía! Start with the CHECK-OUT rooms: new guests arrive at 14:00.',

    luciaBad: (num, g, w) => `👩‍💼 Lucía: "Sofía! The towels in ${num} are NOT right. ${g} guests: ${g} bath, ${g} bidet, ${g} hand towels and 1 bath mat." (strike ${w}/3)`,
    luciaGood: num => `👩‍💼 Lucía: "Room ${num} is perfect, brava Sofía." (+30)`,

    towelDlgTitle: num => `🧺 Restock towels — Room ${num}`,
    towelDlgMeta: (g, st) => `${g} · ${st} — how many of each do you leave?`,
    towelItems: {
      grandes: '🧖 Bath towels', bidet: '🚿 Bidet towels',
      pequenas: '🤲 Hand towels', alfombrin: '🦶 Bath mat (floor)',
    },
    youHave: n => `you have ${n}`,
    placeTowels: 'Place towels', later: 'Maybe later…',

    pressKey: ' — press E', holdKey: ' — hold E',
    pressTouch: ' — tap ✋', holdTouch: ' — hold ✋',

    endTitles: {
      perfecto: '🎉 Shift complete!',
      fin: `🕑 It's 14:00 — shift over`,
      despido: '😱 Lucía sends you home…',
    },
    endPerfect: (total, left) => `You finished all ${total} rooms${left ? ` with ${left} min to spare` : ''}. Your coworkers applaud from the laundry!`,
    endTime: missing => missing <= 0 ? 'Everything done just in time!'
      : `You left ${missing} room(s) unfinished. Anna will lend you a hand… this time.`,
    endFired: `Three failed inspections. Tomorrow you'll apologize with a good caffè in the piazzetta.`,
    endRows: ['🛏 Rooms finished', '🧖 Perfect towel sets', '🧺 Laundry trips',
      '⚠️ Mistakes / warnings', '🕑 Clock-out time', '⭐ Final score'],
    again: '🔁 Another shift',

    sheetTitle: '🗒 Your work sheet — Floor 2',
    sheetCols: ['Room', 'Status', 'Guests', 'Night', 'Sheets'],
    sheetChange: 'CHANGE', sheetNo: 'not due',

    signStairs: 'STAIRS', signOffice: 'OFFICE',
    signFloor: f => `FLOOR ${f}`,
    signLobby: 'GROUND FLOOR · RECEPTION',
    signBasement: 'BASEMENT · LAUNDRY',
    signLaundry: '🧺 LAUNDRY',
    signWashers: 'WASHERS · AQUA', signDryers: 'DRYERS', signDirty: 'DIRTY LINEN',

    maidLabel: (n, f) => `${n} · floor ${f}`,
    marcoLabel: 'Marco · Floor 4',
    carmelaLabel: 'Carmela · Laundry',
    luciaLabel: 'Lucía · Head housekeeper',

    objGoRoom: (num, st) => `Go to room <b>${num}</b> — ${st}`,
    objFollow: '✅ Do the tasks on the list (the floating icons mark them)',
    objLaundry: `🛗 You're out of linen: take the lift down to the laundry (B1)`,
    objGoFloor: '🛗 Go to the lift and ride up to your floor (2nd)',
    objDeliver: '🧺 Give the dirty linen to Carmela (floating icon)',
    objRefill: '🧖 Restock your cart at the shelves (floating icon)',
    objBackUp: '🛗 Cart ready: back to the lift, up to floor 2',
    tutMove: '🎮 Move with W A S D or the arrow keys',
    tutMoveTouch: '🎮 Move with the joystick on the left',
    tutLook: `👀 Move the mouse to look around (click the screen if it won't turn)`,
    tutLookTouch: '👀 Drag the screen to look around',
  },

  // -------------------------------------------------------------- ITALIANO --
  it: {
    htmlTitle: 'Hotel Dino Blu — Turno di Pulizie 3D',
    sub: `Praia a Mare · Calabria · di fronte all'Isola di Dino`,
    story: `Sei <b>Sofia</b>, cameriera ai piani di un hotel sul mare. Pulisci le
        <b>camere del tuo piano</b> prima delle <b>14:00</b>. Tranquilla: il gioco ti guida —
        segui il <b>cartello dorato</b> in alto e la <b>freccia dorata ▼</b>.`,
    manualTitle: '📋 Manuale della cameriera',
    manual: [
      `🔴 <b>PARTENZA</b> (l'ospite se ne va): cambio <b>completo</b> — togliere tutta la biancheria,
        lenzuola nuove, bagno a fondo, asciugamani nuovi, pavimento, cestino e cortesie.`,
      `🔵 <b>FERMATA</b> (l'ospite resta): ripasso giornaliero — rifare il letto, ripassare il bagno,
        cambiare gli asciugamani, cestino e pavimento. Le <b>lenzuola si cambiano ogni 3 notti</b>.`,
      `🧺 <b>Asciugamani per camera</b>: per ogni ospite <b>1 telo grande + 1 bidet + 1 piccolo</b>,
        più <b>1 tappetino</b> per il pavimento del bagno.`,
      `👜 Il carrello porta una quantità limitata: scendi con l'ascensore in <b>lavanderia (P-1)</b>
        a consegnare la biancheria sporca e rifornire quella pulita.`,
      `👩‍💼 Lucia ispeziona le camere finite. Tre richiami e… giornata rovinata!`,
    ],
    controlsTitle: '🎮 Comandi',
    desktopHelp: `Mouse per guardare · <b>W A S D</b> / frecce per muoverti ·
        tieni premuto <b>E</b> per le attività · <b>Shift</b> per correre`,
    touchHelp: `Joystick sinistro per muoverti · trascina lo schermo per guardare ·
        tieni premuto il pulsante ✋ per le attività`,
    start: '🧹 Inizia il turno',
    castTitle: '👭 La squadra dell\'Hotel Dino Blu',
    cast: [
      { img: 'sofia', name: 'Sofia', role: 'Tu · 2º piano' },
      { img: 'anna', name: 'Anna', role: '1º piano' },
      { img: 'giulia', name: 'Giulia', role: '3º piano' },
      { img: 'marco', name: 'Marco', role: '4º piano' },
      { img: 'carmela', name: 'Carmela', role: 'Lavanderia' },
    ],

    tasks: {
      strip: 'Togliere la biancheria usata', bedC: 'Cambiare le lenzuola', bed: 'Rifare il letto',
      bath: 'Pulire il bagno a fondo', bathQ: 'Ripassare il bagno', towels: 'Rifornire gli asciugamani',
      trash: 'Svuotare il cestino', floor: 'Lavare il pavimento', amen: 'Rifornire le cortesie',
    },
    inv: {
      sabanas: '🛏 Set lenzuola', grandes: '🧖 Teli grandi', bidet: '🚿 Asc. bidet',
      pequenas: '🤲 Asc. piccoli', alfombrin: '🦶 Tappetini', cortesia: '🧴 Cortesie',
    },
    cartTitle: '🛒 IL TUO CARRELLO',
    dirtyLabel: '🧺 Biancheria sporca', heavy: ' (pesa!)',
    paceOk: 'Ritmo ✅', paceBad: 'Ritmo ⚠️ sbrigati!',

    partenza: 'PARTENZA', fermata: 'FERMATA', libre: 'LIBERA', hecha: '✔ FATTA',
    roomTitle: n => `Camera ${n}`,
    partenzaFull: '🔴 PARTENZA — cambio completo',
    fermataNight: n => `🔵 FERMATA — notte ${n}`,
    sheetDue: ' · tocca il cambio lenzuola!',
    guests: n => `${n} ospit${n > 1 ? 'i' : 'e'}`,
    nightShort: n => ` · notte ${n}`,
    sheetChangeCard: 'cambio lenzuola!',
    towelHint: n => `🧖 Asciugamani: ${n} grandi · ${n} bidet · ${n} piccoli · 1 tappetino`,

    blockedSheets: '⚠ Niente lenzuola pulite — scendi in lavanderia (P-1)',
    blockedAmen: '⚠ Niente cortesie — rifornisci il carrello in lavanderia',
    blockedTowels: '⚠ Niente asciugamani — scendi in lavanderia (P-1)',

    roomDone: (num, bonus) => `✨ Camera ${num} pronta! (+${bonus})`,
    towelPerfect: '🧖 Set di asciugamani perfetto! (+30)',
    towelWrong: '🤔 Mmm… non sembra la quantità giusta. Speriamo che Lucia non se ne accorga…',
    carmelaThanks: (n, p) => `🧺 Carmela: «Grazie! ${n} capi da lavare.» (+${p})`,
    cartRefilled: '🧖 Carrello rifornito: lenzuola e asciugamani puliti e stirati ✨',
    noDirty: 'Non hai biancheria sporca', cartFull: 'Il carrello è già pieno',
    deliverDirty: '🧺 Consegnare la biancheria sporca',
    refillCart: '🧖 Rifornire il carrello di biancheria pulita',
    callLift: `Chiamare l'ascensore`,
    exitDoor: 'Uscire in strada',
    exitMsg: '🚪 Non puoi andartene a metà turno! Lucia ti sta guardando… 👀',

    liftTitle: '🛗 Ascensore di servizio', liftMeta: 'A che piano vai?', close: 'Chiudi',
    floors: {
      '-1': 'P-1 · Lavanderia 🧺', 0: 'PT · Reception 🛎', 1: '1º piano · Anna',
      2: '2º piano · IL TUO PIANO 🧹', 3: '3º piano · Giulia', 4: '4º piano · Martina',
    },
    toastLaundry: '🧺 Lavanderia: 5 lavatrici e 2 asciugatrici a pieno regime.',
    toastLobby: `🛎 Reception dell'Hotel Dino Blu. La piazzetta e il mare sono lì fuori!`,
    toastMyFloor: '🧹 Il tuo piano. Sotto con quelle camere!',
    toastStart: '🧹 Buongiorno, Sofia! Comincia dalle PARTENZE: i nuovi ospiti arrivano alle 14:00.',

    luciaBad: (num, g, w) => `👩‍💼 Lucia: «Sofia! Gli asciugamani della ${num} NON vanno bene. ${g} ospiti: ${g} grandi, ${g} bidet, ${g} piccoli e 1 tappetino.» (richiamo ${w}/3)`,
    luciaGood: num => `👩‍💼 Lucia: «La ${num} è perfetta, brava Sofia.» (+30)`,

    towelDlgTitle: num => `🧺 Rifornire asciugamani — Cam. ${num}`,
    towelDlgMeta: (g, st) => `${g} · ${st} — quanti ne lasci di ognuno?`,
    towelItems: {
      grandes: '🧖 Teli grandi', bidet: '🚿 Asciugamani bidet',
      pequenas: '🤲 Asciugamani piccoli', alfombrin: '🦶 Tappetino (pavimento)',
    },
    youHave: n => `ne hai ${n}`,
    placeTowels: 'Sistema gli asciugamani', later: 'Magari dopo…',

    pressKey: ' — premi E', holdKey: ' — tieni premuto E',
    pressTouch: ' — tocca ✋', holdTouch: ' — tieni premuto ✋',

    endTitles: {
      perfecto: '🎉 Turno completato!',
      fin: '🕑 Sono le 14:00 — fine turno',
      despido: '😱 Lucia ti manda a casa…',
    },
    endPerfect: (total, left) => `Hai finito tutte le ${total} camere${left ? ` con ${left} min di anticipo` : ''}. Le colleghe ti applaudono dalla lavanderia!`,
    endTime: missing => missing <= 0 ? 'Tutto pronto appena in tempo!'
      : `Hai lasciato ${missing} camera/e da finire. Anna ti darà una mano… per questa volta.`,
    endFired: 'Tre richiami alle ispezioni. Domani toccherà scusarsi con un buon caffè in piazzetta.',
    endRows: ['🛏 Camere finite', '🧖 Set di asciugamani perfetti', '🧺 Viaggi in lavanderia',
      '⚠️ Errori / richiami', '🕑 Ora di uscita', '⭐ Punteggio finale'],
    again: '🔁 Un altro turno',

    sheetTitle: '🗒 Il tuo rapporto di lavoro — 2º piano',
    sheetCols: ['Cam.', 'Stato', 'Ospiti', 'Notte', 'Lenzuola'],
    sheetChange: 'CAMBIARE', sheetNo: 'non tocca',

    signStairs: 'SCALE', signOffice: 'OFFICE',
    signFloor: f => `PIANO ${f}`,
    signLobby: 'PIANO TERRA · RECEPTION',
    signBasement: 'SEMINTERRATO · LAVANDERIA',
    signLaundry: '🧺 LAVANDERIA',
    signWashers: 'LAVATRICI · AQUA', signDryers: 'ASCIUGATRICI', signDirty: 'BIANCHERIA SPORCA',

    maidLabel: (n, f) => `${n} · ${f}º piano`,
    marcoLabel: 'Marco · 4º piano',
    carmelaLabel: 'Carmela · Lavanderia',
    luciaLabel: 'Lucia · Governante',

    objGoRoom: (num, st) => `Vai alla camera <b>${num}</b> — ${st}`,
    objFollow: '✅ Fai le attività della lista (le icone fluttuanti te le segnano)',
    objLaundry: '🛗 Niente biancheria: scendi con l\'ascensore in lavanderia (P-1)',
    objGoFloor: '🛗 Vai all\'ascensore e sali al tuo piano (il 2º)',
    objDeliver: '🧺 Consegna la biancheria sporca a Carmela (icona fluttuante)',
    objRefill: '🧖 Rifornisci il carrello agli scaffali (icona fluttuante)',
    objBackUp: '🛗 Carrello pronto: torna all\'ascensore e sali al 2º',
    tutMove: '🎮 Muoviti con W A S D o le frecce',
    tutMoveTouch: '🎮 Muoviti con il joystick a sinistra',
    tutLook: '👀 Muovi il mouse per guardare (clicca sullo schermo se non gira)',
    tutLookTouch: '👀 Trascina lo schermo per guardarti intorno',
  },
};

export const LANGS = [['es', 'Español'], ['en', 'English'], ['it', 'Italiano']];

function detectLang() {
  const saved = localStorage.getItem('hg-lang');
  if (saved && DICTS[saved]) return saved;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return DICTS[nav] ? nav : 'en';
}

export const LANG = detectLang();
export const S = DICTS[LANG];

export function setLang(code) {
  localStorage.setItem('hg-lang', code);
  location.reload(); // los textos 3D se hornean en texturas al cargar
}
