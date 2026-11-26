/* global __VPN_BUILD_CONFIG__ */
'use strict';

/**
 * VPN AI Support Chat Widget (TASK-006)
 * Lightweight, zero-dependency, 13-language floating support widget for NordelVPN, LuniVPN, kuniVPN, N1X VPN.
 * Native brand-matched CSS-variable presets (--sup-*) for all 4 sites.
 * Defaults to secure public-web App CTA teaser mode (zero guest API exposure); full live chat activates when webTeaser === false.
 */

var BRAND_NAMES = {
  nordel: 'NordelVPN',
  luni: 'LuniVPN',
  kuni: 'kuniVPN',
  n1x: 'N1X VPN'
};

var BRAND_APP_ANCHORS = {
  nordel: '#app',
  luni: '#the-app',
  kuni: '#apps',
  n1x: '#the-app'
};

/**
 * Brand design presets (CSS custom properties — easy copy-paste / override per site).
 */
var THEME_PRESETS = {
  nordel: {
    '--sup-font': 'Arial, sans-serif',
    '--sup-font-heading': 'Arial, sans-serif',
    '--sup-heading-style': 'normal',
    '--sup-heading-weight': '700',
    '--sup-heading-tracking': '-0.02em',
    '--sup-bg': 'var(--surface, #ffffff)',
    '--sup-body-bg': 'var(--bg, #fafdfe)',
    '--sup-text': 'var(--text, #102f53)',
    '--sup-muted': 'var(--muted, #56738d)',
    '--sup-border': 'var(--border, #d5e5ed)',
    '--sup-accent': 'var(--accent, #17568e)',
    '--sup-accent-hover': 'var(--highlight, #5c94be)',
    '--sup-on-accent': 'var(--on-accent, #ffffff)',
    '--sup-head-bg': 'var(--accent, #17568e)',
    '--sup-head-text': 'var(--on-accent, #ffffff)',
    '--sup-head-border': 'transparent',
    '--sup-head-btn-bg': 'rgba(255, 255, 255, 0.16)',
    '--sup-head-btn-border': 'rgba(255, 255, 255, 0.34)',
    '--sup-ai-bg': 'var(--soft, #e9f4f8)',
    '--sup-ai-text': 'var(--text, #102f53)',
    '--sup-op-bg': 'var(--popular, #ecf6fa)',
    '--sup-op-border': 'var(--popular-border, #83bfdf)',
    '--sup-sys-bg': 'var(--panel, #ecf6fa)',
    '--sup-chip-bg': 'var(--soft, #e9f4f8)',
    '--sup-chip-border': 'var(--border, #d5e5ed)',
    '--sup-input-bg': 'var(--bg, #fafdfe)',
    '--sup-radius-panel': '20px',
    '--sup-radius-fab': '999px',
    '--sup-radius-btn': '999px',
    '--sup-radius-input': '12px',
    '--sup-radius-msg': '14px',
    '--sup-shadow': '0 20px 50px rgba(16, 47, 83, 0.2)',
    '--sup-fab-shadow': '0 10px 26px rgba(23, 86, 142, 0.32)'
  },
  luni: {
    '--sup-font': "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
    '--sup-font-heading': "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    '--sup-heading-style': 'normal',
    '--sup-heading-weight': '600',
    '--sup-heading-tracking': '0.01em',
    '--sup-bg': '#fef4e4',
    '--sup-body-bg': '#faf0e5',
    '--sup-text': '#143622',
    '--sup-muted': '#5e6b5e',
    '--sup-border': '#dfd9c9',
    '--sup-accent': '#143622',
    '--sup-accent-hover': '#284d30',
    '--sup-on-accent': '#fef4e4',
    '--sup-head-bg': '#143622',
    '--sup-head-text': '#fef4e4',
    '--sup-head-border': '#6a7849',
    '--sup-head-btn-bg': 'rgba(254, 244, 228, 0.14)',
    '--sup-head-btn-border': 'rgba(254, 244, 228, 0.35)',
    '--sup-ai-bg': '#f1ebda',
    '--sup-ai-text': '#143622',
    '--sup-op-bg': '#e7eadb',
    '--sup-op-border': '#6a7849',
    '--sup-sys-bg': '#f1ebda',
    '--sup-chip-bg': '#f1ebda',
    '--sup-chip-border': '#6a7849',
    '--sup-input-bg': '#fef4e4',
    '--sup-radius-panel': '22px',
    '--sup-radius-fab': '999px',
    '--sup-radius-btn': '999px',
    '--sup-radius-input': '12px',
    '--sup-radius-msg': '14px',
    '--sup-shadow': '0 22px 48px rgba(20, 54, 34, 0.18)',
    '--sup-fab-shadow': '0 10px 24px rgba(20, 54, 34, 0.28)'
  },
  kuni: {
    '--sup-font': "'Montserrat', Arial, Helvetica, sans-serif",
    '--sup-font-heading': "'Montserrat', Arial, Helvetica, sans-serif",
    '--sup-heading-style': 'normal',
    '--sup-heading-weight': '800',
    '--sup-heading-tracking': '-0.01em',
    '--sup-bg': 'var(--surface, #151515)',
    '--sup-body-bg': 'var(--bg, #080808)',
    '--sup-text': 'var(--text, #f7f2e8)',
    '--sup-muted': 'var(--muted, #b9b5ad)',
    '--sup-border': '#45413b',
    '--sup-accent': 'var(--accent, #ff7a00)',
    '--sup-accent-hover': '#ff941f',
    '--sup-on-accent': '#080808',
    '--sup-head-bg': '#151515',
    '--sup-head-text': '#f7f2e8',
    '--sup-head-border': '#45413b',
    '--sup-head-btn-bg': 'rgba(255, 122, 0, 0.14)',
    '--sup-head-btn-border': 'rgba(255, 122, 0, 0.5)',
    '--sup-ai-bg': '#1f1e1c',
    '--sup-ai-text': '#f7f2e8',
    '--sup-op-bg': 'rgba(255, 122, 0, 0.14)',
    '--sup-op-border': 'rgba(255, 122, 0, 0.55)',
    '--sup-sys-bg': 'rgba(255, 122, 0, 0.12)',
    '--sup-chip-bg': 'rgba(255, 122, 0, 0.1)',
    '--sup-chip-border': 'rgba(255, 122, 0, 0.45)',
    '--sup-input-bg': '#0f0f0f',
    '--sup-radius-panel': '14px',
    '--sup-radius-fab': '10px',
    '--sup-radius-btn': '10px',
    '--sup-radius-input': '10px',
    '--sup-radius-msg': '10px',
    '--sup-shadow': '0 22px 54px rgba(0, 0, 0, 0.65)',
    '--sup-fab-shadow': '0 10px 28px rgba(255, 122, 0, 0.34)'
  },
  n1x: {
    '--sup-font': 'Manrope, sans-serif',
    '--sup-font-heading': 'Exo, sans-serif',
    '--sup-heading-style': 'italic',
    '--sup-heading-weight': '800',
    '--sup-heading-tracking': '0.01em',
    '--sup-bg': 'var(--bg-surface, #19191f)',
    '--sup-body-bg': 'var(--bg-primary, #0d0c12)',
    '--sup-text': 'var(--text-primary, #f8f0e0)',
    '--sup-muted': 'var(--text-secondary, #c7c4bb)',
    '--sup-border': 'var(--border-subtle, #797872)',
    '--sup-accent': 'var(--accent-lime, #cbf806)',
    '--sup-accent-hover': 'var(--accent-lime-hover, #d8ff18)',
    '--sup-on-accent': 'var(--text-on-accent, #0b0b10)',
    '--sup-head-bg': 'var(--bg-primary, #0d0c12)',
    '--sup-head-text': 'var(--text-primary, #f8f0e0)',
    '--sup-head-border': 'var(--accent-lime, #cbf806)',
    '--sup-head-btn-bg': 'rgba(203, 248, 6, 0.12)',
    '--sup-head-btn-border': 'rgba(203, 248, 6, 0.5)',
    '--sup-ai-bg': 'var(--bg-elevated, #25252e)',
    '--sup-ai-text': 'var(--text-primary, #f8f0e0)',
    '--sup-op-bg': 'rgba(203, 248, 6, 0.12)',
    '--sup-op-border': 'rgba(203, 248, 6, 0.55)',
    '--sup-sys-bg': 'rgba(203, 248, 6, 0.1)',
    '--sup-chip-bg': 'rgba(203, 248, 6, 0.08)',
    '--sup-chip-border': 'rgba(203, 248, 6, 0.45)',
    '--sup-input-bg': 'var(--bg-primary, #0d0c12)',
    '--sup-radius-panel': '4px',
    '--sup-radius-fab': '2px',
    '--sup-radius-btn': '2px',
    '--sup-radius-input': '2px',
    '--sup-radius-msg': '4px',
    '--sup-shadow': '0 24px 60px rgba(0, 0, 0, 0.72)',
    '--sup-fab-shadow': '0 10px 28px rgba(203, 248, 6, 0.28)'
  }
};

var I18N = {
  en: {
    btn: 'Support',
    title: 'Support Assistant',
    subtitleAi: 'AI Assistant · In-App 24/7',
    subtitleWait: 'Connecting to a support specialist...',
    subtitleOp: 'Support specialist online',
    greeting: 'Hi! I am the AI Support Assistant for {brand}. Ask about plans, VPN setup, devices, or your subscription.',
    placeholder: 'Type your message...',
    send: 'Send',
    operatorBtn: 'Operator',
    aiLabel: 'AI Assistant',
    opLabel: 'Support Specialist',
    youLabel: 'You',
    sysLabel: 'System',
    typing: 'Thinking...',
    errorSend: 'Could not send message. Please try again.',
    quick: ['Plans & Prices', 'How to setup VPN', 'Device limit (5/10)', 'Talk to operator'],
    teaserBadge: 'Protected in-app access',
    teaserTitle: 'AI Support Bot lives inside the {brand} app',
    teaserText: 'Download the {brand} app and use our personal 24/7 AI assistant right inside — with instant diagnostics, setup help, and direct connection to a support specialist.',
    teaserPerks: [
      '24/7 AI support bot built into the app',
      'Automatic check of your subscription & VPN connection',
      'Instant handoff to a live specialist when needed'
    ],
    teaserDownload: 'Download App',
    teaserAccount: 'Open Account'
  },
  ru: {
    btn: 'Поддержка',
    title: 'Ассистент поддержки',
    subtitleAi: 'AI-бот · В приложении 24/7',
    subtitleWait: 'Подключаем специалиста поддержки...',
    subtitleOp: 'Ассистент поддержки в чате',
    greeting: 'Здравствуйте! Я AI-ассистент поддержки {brand}. Помогу с тарифами, настройкой VPN, лимитом устройств и проверкой подписки.',
    placeholder: 'Напишите ваш вопрос...',
    send: 'Отправить',
    operatorBtn: 'Оператор',
    aiLabel: 'AI-ассистент',
    opLabel: 'Ассистент поддержки',
    youLabel: 'Вы',
    sysLabel: 'Система',
    typing: 'Печатает...',
    errorSend: 'Не удалось отправить сообщение. Попробуйте ещё раз.',
    quick: ['Тарифы и цены', 'Как настроить VPN', 'Сколько устройств можно подключить', 'Позови оператора'],
    teaserBadge: 'Защищённый доступ в приложении',
    teaserTitle: 'Воспользуйтесь AI-ботом в приложении {brand}',
    teaserText: 'Скачайте приложение {brand} — внутри вас ждёт персональный AI-ассистент поддержки 24/7, автоматическая диагностика подключения и быстрая связь со специалистом.',
    teaserPerks: [
      'Персональный AI-бот поддержки 24/7 внутри приложения',
      'Автопроверка подписки, устройств и ошибок подключения',
      'Подключение живого специалиста в один клик'
    ],
    teaserDownload: 'Скачать приложение',
    teaserAccount: 'Личный кабинет'
  },
  uk: {
    btn: 'Підтримка',
    title: 'Асистент підтримки',
    subtitleAi: 'AI-бот · У додатку 24/7',
    subtitleWait: 'Підключаємо спеціаліста підтримки...',
    subtitleOp: 'Спеціаліст підтримки в чаті',
    greeting: 'Вітаємо! Я AI-асистент підтримки {brand}. Допоможу з тарифами, налаштуванням VPN та перевіркою підписки.',
    placeholder: 'Напишіть повідомлення...',
    send: 'Надіслати',
    operatorBtn: 'Оператор',
    aiLabel: 'AI-асистент',
    opLabel: 'Спеціаліст підтримки',
    youLabel: 'Ви',
    sysLabel: 'Система',
    typing: 'Друкує...',
    errorSend: 'Не вдалося надіслати повідомлення.',
    quick: ['Тарифи', 'Налаштування VPN', 'Ліміт пристроїв', 'Оператор'],
    teaserBadge: 'Захищений доступ у додатку',
    teaserTitle: 'AI-бот підтримки доступний у додатку {brand}',
    teaserText: 'Завантажте додаток {brand} та скористайтеся персональним AI-ботом підтримки 24/7 усередині — з автодіагностикою та зв’язком зі спеціалістом.',
    teaserPerks: [
      'AI-бот підтримки 24/7 прямо в додатку',
      'Автоперевірка підписки та підключення VPN',
      'Швидкий перехід до живого спеціаліста'
    ],
    teaserDownload: 'Завантажити додаток',
    teaserAccount: 'Особистий кабінет'
  },
  pl: {
    btn: 'Wsparcie',
    title: 'Asystent wsparcia',
    subtitleAi: 'Bot AI · W aplikacji 24/7',
    subtitleWait: 'Łączenie ze specjalistą...',
    subtitleOp: 'Specjalista wsparcia online',
    greeting: 'Cześć! Jestem asystentem AI {brand}. Pomogę z planami, konfiguracją VPN i Twoją subskrypcją.',
    placeholder: 'Wpisz wiadomość...',
    send: 'Wyślij',
    operatorBtn: 'Operator',
    aiLabel: 'Asystent AI',
    opLabel: 'Specjalista',
    youLabel: 'Ty',
    sysLabel: 'System',
    typing: 'Pisze...',
    errorSend: 'Nie udało się wysłać wiadomości.',
    quick: ['Plany i ceny', 'Konfiguracja VPN', 'Limit urządzeń', 'Operator'],
    teaserBadge: 'Bezpieczny dostęp w aplikacji',
    teaserTitle: 'Skorzystaj z bota AI w aplikacji {brand}',
    teaserText: 'Pobierz aplikację {brand}, aby korzystać z osobistego bota wsparcia AI 24/7 — z diagnostyką połączenia i szybkim kontaktem ze specjalistą.',
    teaserPerks: [
      'Bot wsparcia AI 24/7 w aplikacji',
      'Automatyczna diagnostyka subskrypcji i VPN',
      'Szybkie połączenie ze specjalistą'
    ],
    teaserDownload: 'Pobierz aplikację',
    teaserAccount: 'Moje konto'
  },
  de: {
    btn: 'Support',
    title: 'Support-Assistent',
    subtitleAi: 'KI-Bot · In der App 24/7',
    subtitleWait: 'Verbindung zum Spezialisten...',
    subtitleOp: 'Support-Spezialist im Chat',
    greeting: 'Hallo! Ich bin der KI-Support-Assistent für {brand}. Fragen Sie mich zu Tarifen, VPN-Einrichtung oder Ihrem Abo.',
    placeholder: 'Nachricht eingeben...',
    send: 'Senden',
    operatorBtn: 'Mitarbeiter',
    aiLabel: 'KI-Assistent',
    opLabel: 'Support-Spezialist',
    youLabel: 'Sie',
    sysLabel: 'System',
    typing: 'Schreibt...',
    errorSend: 'Nachricht konnte nicht gesendet werden.',
    quick: ['Tarife & Preise', 'VPN einrichten', 'Gerätelimit', 'Mitarbeiter'],
    teaserBadge: 'Geschützter In-App-Zugang',
    teaserTitle: 'KI-Support-Bot direkt in der {brand}-App',
    teaserText: 'Laden Sie die {brand}-App herunter und nutzen Sie unseren persönlichen 24/7 KI-Support-Bot direkt in der App – inklusive Diagnose und Live-Support.',
    teaserPerks: [
      'Persönlicher 24/7 KI-Support-Bot in der App',
      'Automatische Prüfung von Abo & VPN-Verbindung',
      'Direkte Übergabe an einen Support-Spezialisten'
    ],
    teaserDownload: 'App herunterladen',
    teaserAccount: 'Konto öffnen'
  },
  lt: {
    btn: 'Pagalba',
    title: 'Pagalbos asistentas',
    subtitleAi: 'AI botas · Programėlėje 24/7',
    subtitleWait: 'Jungiama prie specialisto...',
    subtitleOp: 'Specialistas prisijungęs',
    greeting: 'Sveiki! Esu {brand} AI pagalbos asistentas. Padėsiu dėl planų, VPN nustatymo ir prenumeratos.',
    placeholder: 'Įveskite žinutę...',
    send: 'Siųsti',
    operatorBtn: 'Operatorius',
    aiLabel: 'AI asistentas',
    opLabel: 'Specialistas',
    youLabel: 'Jūs',
    sysLabel: 'Sistema',
    typing: 'Rašo...',
    errorSend: 'Nepavyko išsiųsti žinutės.',
    quick: ['Planai', 'VPN nustatymas', 'Įrenginių limitas', 'Operatorius'],
    teaserBadge: 'Apsaugota prieiga programėlėje',
    teaserTitle: 'Naudokitės AI botu {brand} programėlėje',
    teaserText: 'Atsisiųskite {brand} programėlę ir naudokitės asmeniniu 24/7 AI pagalbos botu tiesiogiai viduje.',
    teaserPerks: [
      '24/7 AI pagalbos botas programėlėje',
      'Automatinė prenumeratos ir VPN diagnostika',
      'Greitas susisiekimas su specialistu'
    ],
    teaserDownload: 'Atsisiųsti programėlę',
    teaserAccount: 'Atidaryti paskyrą'
  },
  tr: {
    btn: 'Destek',
    title: 'Destek Asistanı',
    subtitleAi: 'AI Bot · Uygulamada 7/24',
    subtitleWait: 'Uzmana bağlanılıyor...',
    subtitleOp: 'Destek uzmanı çevrimiçi',
    greeting: 'Merhaba! {brand} AI Destek Asistanıyım. Planlar, VPN kurulumu ve aboneliğiniz hakkında yardımcı olabilirim.',
    placeholder: 'Mesajınızı yazın...',
    send: 'Gönder',
    operatorBtn: 'Operatör',
    aiLabel: 'AI Asistan',
    opLabel: 'Destek Uzmanı',
    youLabel: 'Siz',
    sysLabel: 'Sistem',
    typing: 'Yazıyor...',
    errorSend: 'Mesaj gönderilemedi.',
    quick: ['Planlar', 'VPN Kurulumu', 'Cihaz limiti', 'Operatör'],
    teaserBadge: 'Uygulama içi güvenli erişim',
    teaserTitle: 'AI destek botunu {brand} uygulamasında kullanın',
    teaserText: '{brand} uygulamasını indirin ve 7/24 kişisel AI destek botundan, otomatik tanılamadan ve canlı destekten yararlanın.',
    teaserPerks: [
      'Uygulama içinde 7/24 AI destek botu',
      'Abonelik ve VPN bağlantı kontrolü',
      'Tek tıkla canlı uzmana aktarım'
    ],
    teaserDownload: 'Uygulamayı İndir',
    teaserAccount: 'Hesabım'
  },
  ro: {
    btn: 'Suport',
    title: 'Asistent Suport',
    subtitleAi: 'Bot AI · În aplicație 24/7',
    subtitleWait: 'Conectare la un specialist...',
    subtitleOp: 'Specialist suport online',
    greeting: 'Salut! Sunt asistentul AI {brand}. Te pot ajuta cu planurile, configurarea VPN și abonamentul tău.',
    placeholder: 'Scrie mesajul...',
    send: 'Trimite',
    operatorBtn: 'Operator',
    aiLabel: 'Asistent AI',
    opLabel: 'Specialist',
    youLabel: 'Tu',
    sysLabel: 'Sistem',
    typing: 'Scrie...',
    errorSend: 'Nu s-a putut trimite mesajul.',
    quick: ['Planuri', 'Configurare VPN', 'Limită dispozitive', 'Operator'],
    teaserBadge: 'Acces securizat în aplicație',
    teaserTitle: 'Folosește botul AI în aplicația {brand}',
    teaserText: 'Descarcă aplicația {brand} și folosește asistentul AI 24/7 direct din aplicație, cu diagnosticare automată și suport live.',
    teaserPerks: [
      'Bot de suport AI 24/7 în aplicație',
      'Verificare automată a abonamentului și VPN-ului',
      'Transfer rapid către un specialist'
    ],
    teaserDownload: 'Descarcă aplicația',
    teaserAccount: 'Contul meu'
  },
  sk: {
    btn: 'Podpora',
    title: 'Asistent podpory',
    subtitleAi: 'AI bot · V aplikácii 24/7',
    subtitleWait: 'Pripájame špecialistu...',
    subtitleOp: 'Špecialista podpory online',
    greeting: 'Ahoj! Som AI asistent podpory {brand}. Pomôžem s tarifami, nastavením VPN aj predplatným.',
    placeholder: 'Napíšte správu...',
    send: 'Odoslať',
    operatorBtn: 'Operátor',
    aiLabel: 'AI asistent',
    opLabel: 'Špecialista',
    youLabel: 'Vy',
    sysLabel: 'Systém',
    typing: 'Píše...',
    errorSend: 'Správu sa nepodarilo odoslať.',
    quick: ['Plány', 'Nastavenie VPN', 'Limit zariadení', 'Operátor'],
    teaserBadge: 'Chránený prístup v aplikácii',
    teaserTitle: 'Využite AI bota v aplikácii {brand}',
    teaserText: 'Stiahnite si aplikáciu {brand} a využite osobného AI bota podpory 24/7 priamo v aplikácii s automatickou diagnostikou.',
    teaserPerks: [
      'AI bot podpory 24/7 priamo v aplikácii',
      'Automatická kontrola predplatného a VPN',
      'Okamžité spojenie so špecialistom'
    ],
    teaserDownload: 'Stiahnuť aplikáciu',
    teaserAccount: 'Môj účet'
  },
  hr: {
    btn: 'Podrška',
    title: 'Asistent podrške',
    subtitleAi: 'AI bot · U aplikaciji 24/7',
    subtitleWait: 'Povezivanje sa stručnjakom...',
    subtitleOp: 'Stručnjak podrške online',
    greeting: 'Pozdrav! Ja sam AI asistent za {brand}. Mogu pomoći oko paketa, VPN postavki i pretplate.',
    placeholder: 'Upišite poruku...',
    send: 'Pošalji',
    operatorBtn: 'Operater',
    aiLabel: 'AI asistent',
    opLabel: 'Stručnjak',
    youLabel: 'Vi',
    sysLabel: 'Sustav',
    typing: 'Piše...',
    errorSend: 'Slanje poruke nije uspjelo.',
    quick: ['Paketi', 'VPN postavljanje', 'Limit uređaja', 'Operater'],
    teaserBadge: 'Zaštićeni pristup u aplikaciji',
    teaserTitle: 'Koristite AI bota u {brand} aplikaciji',
    teaserText: 'Preuzmite aplikaciju {brand} i koristite osobnog 24/7 AI bota podrške unutar aplikacije uz automatsku dijagnostiku.',
    teaserPerks: [
      '24/7 AI bot podrške unutar aplikacije',
      'Automatska provjera pretplate i VPN-a',
      'Brzo povezivanje sa stručnjakom'
    ],
    teaserDownload: 'Preuzmi aplikaciju',
    teaserAccount: 'Moj račun'
  },
  sr: {
    btn: 'Podrška',
    title: 'Asistent podrške',
    subtitleAi: 'AI bot · U aplikaciji 24/7',
    subtitleWait: 'Povezivanje sa operaterom...',
    subtitleOp: 'Operater podrške online',
    greeting: 'Zdravo! Ja sam AI asistent podrške za {brand}. Pomažem oko paketa, podešavanja VPN-a i pretplate.',
    placeholder: 'Unesite poruku...',
    send: 'Pošalji',
    operatorBtn: 'Operater',
    aiLabel: 'AI asistent',
    opLabel: 'Operater',
    youLabel: 'Vi',
    sysLabel: 'Sistem',
    typing: 'Kuca...',
    errorSend: 'Slanje poruke nije uspelo.',
    quick: ['Paketi', 'Podešavanje VPN-a', 'Limit uređaja', 'Operater'],
    teaserBadge: 'Zaštićeni pristup u aplikaciji',
    teaserTitle: 'Koristite AI bota u {brand} aplikaciji',
    teaserText: 'Preuzmite {brand} aplikaciju i koristite ličnog 24/7 AI bota podrške unutar aplikacije uz brzu dijagnostiku i operatera.',
    teaserPerks: [
      '24/7 AI bot podrške u aplikaciji',
      'Automatska provera pretplate i VPN-a',
      'Brzo povezivanje sa operaterom'
    ],
    teaserDownload: 'Preuzmi aplikaciju',
    teaserAccount: 'Moj nalog'
  },
  bg: {
    btn: 'Поддръжка',
    title: 'Асистент поддръжка',
    subtitleAi: 'AI бот · В приложението 24/7',
    subtitleWait: 'Свързване със специалист...',
    subtitleOp: 'Специалист на линия',
    greeting: 'Здравейте! Аз съм AI асистентът на {brand}. Мога да помогна с планове, настройка на VPN и абонамент.',
    placeholder: 'Напишете съобщение...',
    send: 'Изпрати',
    operatorBtn: 'Оператор',
    aiLabel: 'AI асистент',
    opLabel: 'Специалист',
    youLabel: 'Вие',
    sysLabel: 'Система',
    typing: 'Пише...',
    errorSend: 'Съобщението не можа да бъде изпратено.',
    quick: ['Планове', 'Настройка на VPN', 'Лимит устройства', 'Оператор'],
    teaserBadge: 'Защитен достъп в приложението',
    teaserTitle: 'Използвайте AI бота в приложението {brand}',
    teaserText: 'Изтеглете приложението {brand} и използвайте личния AI бот за поддръжка 24/7 вътре — с диагностика и връзка със специалист.',
    teaserPerks: [
      '24/7 AI бот за поддръжка в приложението',
      'Автоматична проверка на абонамента и VPN',
      'Бърза връзка с жив специалист'
    ],
    teaserDownload: 'Изтегли приложението',
    teaserAccount: 'Моят профил'
  },
  hu: {
    btn: 'Támogatás',
    title: 'Támogatási asszisztens',
    subtitleAi: 'AI bot · Az alkalmazásban 24/7',
    subtitleWait: 'Kapcsolódás szakértőhöz...',
    subtitleOp: 'Ügyfélszolgálati szakértő online',
    greeting: 'Szia! A {brand} AI támogatási asszisztense vagyok. Segítek a csomagokban, VPN beállításban és előfizetésben.',
    placeholder: 'Írj üzenetet...',
    send: 'Küldés',
    operatorBtn: 'Operátor',
    aiLabel: 'AI asszisztens',
    opLabel: 'Szakértő',
    youLabel: 'Te',
    sysLabel: 'Rendszer',
    typing: 'Gépel...',
    errorSend: 'Nem sikerült elküldeni az üzenetet.',
    quick: ['Csomagok', 'VPN beállítás', 'Eszközlimit', 'Operátor'],
    teaserBadge: 'Védett hozzáférés az appban',
    teaserTitle: 'Használd az AI botot a {brand} alkalmazásban',
    teaserText: 'Töltsd le a {brand} alkalmazást, és használd a 24/7 személyes AI támogatási botot közvetlenül az appban, automatikus diagnosztikával.',
    teaserPerks: [
      '24/7 AI támogatási bot az alkalmazásban',
      'Előfizetés és VPN kapcsolat automatikus ellenőrzése',
      'Azonnali kapcsolat élő szakértővel'
    ],
    teaserDownload: 'Alkalmazás letöltése',
    teaserAccount: 'Fiókom'
  }
};

function safeStorageGet(key) {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Storage may be disabled in private mode
  }
}

function resolveBuildConfig() {
  try {
    if (typeof __VPN_BUILD_CONFIG__ !== 'undefined' && __VPN_BUILD_CONFIG__) {
      return __VPN_BUILD_CONFIG__;
    }
  } catch {
    // Ignore when not built via webpack DefinePlugin
  }
  return {};
}

function resolveConfig(options) {
  var opts = options || {};
  var runtimeCfg = (typeof window !== 'undefined' && window.__VPN_PORTAL_CONFIG__) ? window.__VPN_PORTAL_CONFIG__ : {};
  var buildCfg = resolveBuildConfig();
  var brandSlug = String(runtimeCfg.brandSlug || opts.brandSlug || buildCfg.brandSlug || 'nordel').toLowerCase().trim();
  if (!BRAND_NAMES[brandSlug]) {
    brandSlug = 'nordel';
  }
  var apiBase = String(
    runtimeCfg.dashboardApiUrl || opts.dashboardApiUrl || buildCfg.dashboardApiUrl || 'https://businessdashboard.cods.live'
  ).replace(/\/+$/, '');
  var mode = String(runtimeCfg.mode || opts.mode || buildCfg.mode || 'live').toLowerCase();
  var themeOverrides = Object.assign(
    {},
    THEME_PRESETS[brandSlug] || THEME_PRESETS.nordel,
    opts.theme || {},
    runtimeCfg.supportTheme || {}
  );

  // Public websites default to secure App CTA teaser mode (no guest chat scraping).
  var webTeaser = true;
  if (typeof opts.webTeaser === 'boolean') {
    webTeaser = opts.webTeaser;
  }
  if (typeof runtimeCfg.supportWebTeaser === 'boolean') {
    webTeaser = runtimeCfg.supportWebTeaser;
  }

  return {
    brandSlug: brandSlug,
    brandName: BRAND_NAMES[brandSlug],
    appAnchor: BRAND_APP_ANCHORS[brandSlug] || '#app',
    apiBase: apiBase,
    mode: mode,
    webTeaser: webTeaser,
    theme: themeOverrides
  };
}

function detectLanguage() {
  var htmlLang = (typeof document !== 'undefined' && document.documentElement)
    ? String(document.documentElement.getAttribute('lang') || 'en').toLowerCase().slice(0, 2)
    : 'en';
  return I18N[htmlLang] ? htmlLang : 'en';
}

function getDict(lang) {
  return I18N[lang] || I18N.en;
}

function applyThemeVars(el, theme) {
  if (!el || !theme) return;
  Object.keys(theme).forEach(function (key) {
    if (key.indexOf('--sup-') === 0 && theme[key] !== undefined && theme[key] !== null) {
      el.style.setProperty(key, String(theme[key]));
    }
  });
}

function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById('vpn-support-widget-styles')) {
    return;
  }
  var style = document.createElement('style');
  style.id = 'vpn-support-widget-styles';
  style.textContent = [
    '.vpn-sup-root{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:var(--sup-font,system-ui,-apple-system,sans-serif);color:var(--sup-text,#102f53);}',
    '.vpn-sup-root *{box-sizing:border-box;}',
    '.vpn-sup-fab{display:inline-flex;align-items:center;gap:9px;min-height:46px;padding:11px 20px;border-radius:var(--sup-radius-fab,999px);border:1px solid var(--sup-accent,#17568e);background:var(--sup-accent,#17568e);color:var(--sup-on-accent,#fff);font-family:var(--sup-font-heading,var(--sup-font));font-style:var(--sup-heading-style,normal);font-weight:var(--sup-heading-weight,700);letter-spacing:var(--sup-heading-tracking,0);font-size:15px;line-height:1.2;cursor:pointer;box-shadow:var(--sup-fab-shadow,0 10px 26px rgba(0,0,0,.25));transition:transform .16s ease,background-color .16s ease,border-color .16s ease,box-shadow .16s ease;}',
    '.vpn-sup-fab:hover{transform:translateY(-2px);background:var(--sup-accent-hover,var(--sup-accent));border-color:var(--sup-accent-hover,var(--sup-accent));}',
    '.vpn-sup-fab:focus-visible,.vpn-sup-head__btn:focus-visible,.vpn-sup-send:focus-visible,.vpn-sup-chip:focus-visible,.vpn-sup-input:focus-visible,.vpn-sup-cta:focus-visible{outline:2px solid var(--sup-accent);outline-offset:2px;}',
    '.vpn-sup-fab__icon{width:18px;height:18px;flex:0 0 auto;display:block;}',
    '.vpn-sup-panel{position:fixed;right:20px;bottom:78px;width:380px;max-width:calc(100vw - 24px);height:548px;max-height:calc(100vh - 104px);background:var(--sup-bg,#fff);color:var(--sup-text,#102f53);border:1px solid var(--sup-border,#d5e5ed);border-radius:var(--sup-radius-panel,20px);box-shadow:var(--sup-shadow,0 20px 50px rgba(0,0,0,.22));display:flex;flex-direction:column;overflow:hidden;}',
    '.vpn-sup-panel--teaser{height:auto;max-height:calc(100vh - 104px);}',
    '.vpn-sup-panel[hidden]{display:none!important;}',
    '.vpn-sup-head{padding:14px 16px;background:var(--sup-head-bg,var(--sup-accent));color:var(--sup-head-text,var(--sup-on-accent));border-bottom:1px solid var(--sup-head-border,transparent);display:flex;align-items:center;justify-content:space-between;gap:8px;}',
    '.vpn-sup-head__title{font-family:var(--sup-font-heading,var(--sup-font));font-style:var(--sup-heading-style,normal);font-weight:var(--sup-heading-weight,700);letter-spacing:var(--sup-heading-tracking,0);font-size:17px;line-height:1.2;}',
    '.vpn-sup-head__sub{font-size:12px;opacity:.82;margin-top:2px;}',
    '.vpn-sup-head__actions{display:flex;align-items:center;gap:6px;flex-shrink:0;}',
    '.vpn-sup-head__btn{min-height:32px;border:1px solid var(--sup-head-btn-border,rgba(255,255,255,.35));background:var(--sup-head-btn-bg,rgba(255,255,255,.14));color:var(--sup-head-text,#fff);border-radius:var(--sup-radius-btn,8px);padding:5px 10px;font-family:var(--sup-font);font-size:12px;font-weight:600;cursor:pointer;transition:opacity .15s ease,transform .15s ease;}',
    '.vpn-sup-head__btn:hover{opacity:.9;}',
    '.vpn-sup-body{flex:1;overflow-y:auto;padding:14px;background:var(--sup-body-bg,var(--sup-bg));display:flex;flex-direction:column;gap:10px;}',
    '.vpn-sup-teaser{padding:18px 16px 20px;background:var(--sup-body-bg,var(--sup-bg));display:flex;flex-direction:column;gap:12px;}',
    '.vpn-sup-teaser__badge{align-self:flex-start;display:inline-flex;align-items:center;padding:4px 10px;border-radius:var(--sup-radius-btn,999px);background:var(--sup-chip-bg);border:1px solid var(--sup-chip-border);color:var(--sup-text);font-size:11.5px;font-weight:700;letter-spacing:.02em;}',
    '.vpn-sup-teaser__title{margin:0;font-family:var(--sup-font-heading,var(--sup-font));font-style:var(--sup-heading-style,normal);font-weight:var(--sup-heading-weight,700);letter-spacing:var(--sup-heading-tracking,0);font-size:20px;line-height:1.22;color:var(--sup-text);}',
    '.vpn-sup-teaser__text{margin:0;font-size:13.5px;line-height:1.5;color:var(--sup-muted);}',
    '.vpn-sup-teaser__list{margin:2px 0 4px;padding:12px 14px;list-style:none;border-radius:var(--sup-radius-msg,12px);background:var(--sup-ai-bg);border:1px solid var(--sup-border);display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.4;color:var(--sup-ai-text,var(--sup-text));}',
    '.vpn-sup-teaser__list li{display:flex;align-items:flex-start;gap:8px;}',
    '.vpn-sup-teaser__dot{width:7px;height:7px;border-radius:999px;background:var(--sup-accent);flex:0 0 auto;margin-top:6px;}',
    '.vpn-sup-teaser__actions{display:flex;flex-direction:column;gap:8px;margin-top:4px;}',
    '.vpn-sup-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;padding:11px 16px;border-radius:var(--sup-radius-btn,10px);font-family:var(--sup-font-heading,var(--sup-font));font-style:var(--sup-heading-style,normal);font-weight:var(--sup-heading-weight,700);font-size:14.5px;text-decoration:none;cursor:pointer;transition:background-color .15s ease,border-color .15s ease,transform .15s ease;}',
    '.vpn-sup-cta--primary{background:var(--sup-accent);color:var(--sup-on-accent);border:1px solid var(--sup-accent);}',
    '.vpn-sup-cta--primary:hover{background:var(--sup-accent-hover,var(--sup-accent));border-color:var(--sup-accent-hover,var(--sup-accent));transform:translateY(-1px);}',
    '.vpn-sup-cta--secondary{background:transparent;color:var(--sup-text);border:1px solid var(--sup-border);font-family:var(--sup-font);font-style:normal;font-weight:600;font-size:13.5px;}',
    '.vpn-sup-cta--secondary:hover{border-color:var(--sup-accent);background:var(--sup-chip-bg);}',
    '.vpn-sup-msg{max-width:86%;padding:10px 13px;border-radius:var(--sup-radius-msg,12px);font-size:13.5px;line-height:1.48;white-space:pre-wrap;word-break:break-word;}',
    '.vpn-sup-msg--client{align-self:flex-end;background:var(--sup-accent);color:var(--sup-on-accent);border-bottom-right-radius:3px;}',
    '.vpn-sup-msg--ai{align-self:flex-start;background:var(--sup-ai-bg);color:var(--sup-ai-text,var(--sup-text));border:1px solid var(--sup-border);border-bottom-left-radius:3px;}',
    '.vpn-sup-msg--operator{align-self:flex-start;background:var(--sup-op-bg);color:var(--sup-text);border:1px solid var(--sup-op-border);border-bottom-left-radius:3px;}',
    '.vpn-sup-msg--system{align-self:center;max-width:94%;font-size:12px;color:var(--sup-muted);background:var(--sup-sys-bg);border:1px solid var(--sup-border);padding:6px 10px;text-align:center;}',
    '.vpn-sup-msg__sender{font-size:11px;font-weight:700;opacity:.76;margin-bottom:3px;}',
    '.vpn-sup-msg strong{font-weight:700;}',
    '.vpn-sup-msg code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;padding:1px 5px;border-radius:4px;background:rgba(128,128,128,.18);}',
    '.vpn-sup-quick{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px 10px;background:var(--sup-body-bg,var(--sup-bg));border-top:1px solid var(--sup-border);}',
    '.vpn-sup-quick:empty{display:none;}',
    '.vpn-sup-chip{min-height:32px;border:1px solid var(--sup-chip-border,var(--sup-border));background:var(--sup-chip-bg,transparent);color:var(--sup-text);border-radius:var(--sup-radius-btn,999px);padding:5px 11px;font-family:var(--sup-font);font-size:12px;font-weight:600;cursor:pointer;transition:background-color .15s ease,border-color .15s ease;}',
    '.vpn-sup-chip:hover{background:var(--sup-accent);color:var(--sup-on-accent);border-color:var(--sup-accent);}',
    '.vpn-sup-form{padding:10px 12px;background:var(--sup-bg);border-top:1px solid var(--sup-border);display:flex;gap:8px;align-items:center;}',
    '.vpn-sup-input{flex:1;min-width:0;min-height:40px;border:1px solid var(--sup-border);background:var(--sup-input-bg,transparent);color:var(--sup-text);border-radius:var(--sup-radius-input,10px);padding:9px 12px;font-family:var(--sup-font);font-size:13.5px;}',
    '.vpn-sup-input::placeholder{color:var(--sup-muted);opacity:.85;}',
    '.vpn-sup-send{min-height:40px;border:1px solid var(--sup-accent);background:var(--sup-accent);color:var(--sup-on-accent);border-radius:var(--sup-radius-btn,10px);padding:9px 15px;font-family:var(--sup-font-heading,var(--sup-font));font-style:var(--sup-heading-style,normal);font-size:13.5px;font-weight:var(--sup-heading-weight,700);cursor:pointer;transition:background-color .15s ease,border-color .15s ease;}',
    '.vpn-sup-send:hover:not(:disabled){background:var(--sup-accent-hover,var(--sup-accent));border-color:var(--sup-accent-hover,var(--sup-accent));}',
    '.vpn-sup-send:disabled{opacity:.55;cursor:not-allowed;}',
    '@media(max-width:480px){.vpn-sup-root{right:12px;bottom:12px;}.vpn-sup-panel{right:12px;bottom:70px;width:calc(100vw - 24px);height:72vh;}.vpn-sup-panel--teaser{height:auto;}}'
  ].join('');
  document.head.appendChild(style);
}

function renderFormattedText(container, raw) {
  var lines = String(raw || '').split(/\r?\n/);
  lines.forEach(function (line, lineIdx) {
    if (lineIdx > 0) {
      container.appendChild(document.createElement('br'));
    }
    var cleaned = line.replace(/^#{1,6}\s+/, '');
    var tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    var lastIndex = 0;
    var match;
    while ((match = tokenRegex.exec(cleaned)) !== null) {
      if (match.index > lastIndex) {
        container.appendChild(document.createTextNode(cleaned.slice(lastIndex, match.index)));
      }
      var token = match[0];
      if (token.slice(0, 2) === '**' && token.slice(-2) === '**') {
        var strong = document.createElement('strong');
        strong.textContent = token.slice(2, -2);
        container.appendChild(strong);
      } else if (token.charAt(0) === '`' && token.charAt(token.length - 1) === '`') {
        var code = document.createElement('code');
        code.textContent = token.slice(1, -1);
        container.appendChild(code);
      }
      lastIndex = tokenRegex.lastIndex;
    }
    if (lastIndex < cleaned.length) {
      container.appendChild(document.createTextNode(cleaned.slice(lastIndex)));
    }
  });
}

function createChatIcon() {
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'vpn-sup-fab__icon');
  var path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z');
  svg.appendChild(path);
  return svg;
}

function initSupportWidget(options) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
    return null;
  }
  if (window.__VPN_SUPPORT_WIDGET__) {
    return window.__VPN_SUPPORT_WIDGET__;
  }

  var cfg = resolveConfig(options);
  var sessionStorageKey = cfg.brandSlug + '-vpn-support:session';
  var portalTokenKey = cfg.brandSlug + '-vpn-portal:token';
  var state = {
    open: false,
    lang: detectLanguage(),
    conversationUuid: null,
    sessionToken: safeStorageGet(sessionStorageKey),
    status: 'ai_active',
    messages: [],
    lastMessageId: 0,
    sending: false,
    initialized: false,
    pollTimer: null
  };

  injectStyles();

  var root = document.createElement('div');
  root.className = 'vpn-sup-root';
  root.setAttribute('data-vpn-support-widget', cfg.brandSlug);
  root.setAttribute('data-vpn-support-mode', cfg.webTeaser ? 'app-teaser' : 'chat');
  applyThemeVars(root, cfg.theme);

  var panel = document.createElement('section');
  panel.className = 'vpn-sup-panel' + (cfg.webTeaser ? ' vpn-sup-panel--teaser' : '');
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Support Chat');

  var head = document.createElement('div');
  head.className = 'vpn-sup-head';
  var headInfo = document.createElement('div');
  var titleEl = document.createElement('div');
  titleEl.className = 'vpn-sup-head__title';
  var subEl = document.createElement('div');
  subEl.className = 'vpn-sup-head__sub';
  headInfo.appendChild(titleEl);
  headInfo.appendChild(subEl);

  var headActions = document.createElement('div');
  headActions.className = 'vpn-sup-head__actions';
  var opBtn = document.createElement('button');
  opBtn.type = 'button';
  opBtn.className = 'vpn-sup-head__btn';
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'vpn-sup-head__btn';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close chat');
  if (!cfg.webTeaser) {
    headActions.appendChild(opBtn);
  }
  headActions.appendChild(closeBtn);
  head.appendChild(headInfo);
  head.appendChild(headActions);

  // Teaser elements (public website App CTA mode — zero guest API exposure)
  var teaserWrap = document.createElement('div');
  teaserWrap.className = 'vpn-sup-teaser';
  var teaserBadge = document.createElement('span');
  teaserBadge.className = 'vpn-sup-teaser__badge';
  var teaserTitle = document.createElement('h3');
  teaserTitle.className = 'vpn-sup-teaser__title';
  var teaserText = document.createElement('p');
  teaserText.className = 'vpn-sup-teaser__text';
  var teaserList = document.createElement('ul');
  teaserList.className = 'vpn-sup-teaser__list';
  var teaserActions = document.createElement('div');
  teaserActions.className = 'vpn-sup-teaser__actions';
  var teaserDownloadBtn = document.createElement('a');
  teaserDownloadBtn.className = 'vpn-sup-cta vpn-sup-cta--primary';
  teaserDownloadBtn.href = './index.html' + cfg.appAnchor;
  var teaserAccountBtn = document.createElement('a');
  teaserAccountBtn.className = 'vpn-sup-cta vpn-sup-cta--secondary';
  teaserActions.appendChild(teaserDownloadBtn);
  teaserActions.appendChild(teaserAccountBtn);
  teaserWrap.appendChild(teaserBadge);
  teaserWrap.appendChild(teaserTitle);
  teaserWrap.appendChild(teaserText);
  teaserWrap.appendChild(teaserList);
  teaserWrap.appendChild(teaserActions);

  // Full live chat elements (used when webTeaser === false)
  var bodyEl = document.createElement('div');
  bodyEl.className = 'vpn-sup-body';

  var quickEl = document.createElement('div');
  quickEl.className = 'vpn-sup-quick';

  var form = document.createElement('form');
  form.className = 'vpn-sup-form';
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'vpn-sup-input';
  input.maxLength = 2000;
  var sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.className = 'vpn-sup-send';
  form.appendChild(input);
  form.appendChild(sendBtn);

  panel.appendChild(head);
  if (cfg.webTeaser) {
    panel.appendChild(teaserWrap);
  } else {
    panel.appendChild(bodyEl);
    panel.appendChild(quickEl);
    panel.appendChild(form);
  }

  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'vpn-sup-fab';
  fab.setAttribute('aria-expanded', 'false');
  var fabLabel = document.createElement('span');
  fab.appendChild(createChatIcon());
  fab.appendChild(fabLabel);

  root.appendChild(panel);
  root.appendChild(fab);
  document.body.appendChild(root);

  function buildHeaders() {
    var headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Brand-Slug': cfg.brandSlug,
      'X-Support-Language': state.lang
    };
    var portalToken = safeStorageGet(portalTokenKey);
    if (portalToken) {
      headers.Authorization = 'Bearer ' + portalToken;
    }
    if (state.sessionToken) {
      headers['X-Support-Session'] = state.sessionToken;
    }
    return headers;
  }

  function renderTeaser() {
    var dict = getDict(state.lang);
    teaserBadge.textContent = dict.teaserBadge;
    teaserTitle.textContent = String(dict.teaserTitle || '').replace('{brand}', cfg.brandName);
    teaserText.textContent = String(dict.teaserText || '').replace('{brand}', cfg.brandName);
    teaserList.innerHTML = '';
    (dict.teaserPerks || []).forEach(function (perk) {
      var li = document.createElement('li');
      var dot = document.createElement('span');
      dot.className = 'vpn-sup-teaser__dot';
      var span = document.createElement('span');
      span.textContent = perk;
      li.appendChild(dot);
      li.appendChild(span);
      teaserList.appendChild(li);
    });
    teaserDownloadBtn.textContent = dict.teaserDownload;
    teaserAccountBtn.textContent = dict.teaserAccount;
    teaserAccountBtn.href = safeStorageGet(portalTokenKey) ? './account.html' : './login.html';
  }

  function renderTranslations() {
    var dict = getDict(state.lang);
    fabLabel.textContent = dict.btn;
    titleEl.textContent = cfg.brandName + ' · ' + dict.title;
    if (cfg.webTeaser) {
      subEl.textContent = dict.subtitleAi;
      renderTeaser();
      return;
    }
    if (state.status === 'operator_active') {
      subEl.textContent = dict.subtitleOp;
    } else if (state.status === 'waiting_operator') {
      subEl.textContent = dict.subtitleWait;
    } else {
      subEl.textContent = dict.subtitleAi;
    }
    opBtn.textContent = dict.operatorBtn;
    input.placeholder = dict.placeholder;
    sendBtn.textContent = dict.send;
    renderQuickChips();
  }

  function renderQuickChips() {
    if (cfg.webTeaser) return;
    quickEl.innerHTML = '';
    if (state.messages.length > 1) {
      return;
    }
    var dict = getDict(state.lang);
    (dict.quick || []).forEach(function (label) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'vpn-sup-chip';
      chip.textContent = label;
      chip.addEventListener('click', function () {
        sendText(label);
      });
      quickEl.appendChild(chip);
    });
  }

  function renderMessages() {
    if (cfg.webTeaser) return;
    var dict = getDict(state.lang);
    bodyEl.innerHTML = '';

    var list = state.messages.length > 0
      ? state.messages
      : [{
          sender_type: 'ai',
          body: dict.greeting.replace('{brand}', cfg.brandName)
        }];

    list.forEach(function (msg) {
      var wrap = document.createElement('div');
      wrap.className = 'vpn-sup-msg vpn-sup-msg--' + (msg.sender_type || 'ai');

      if (msg.sender_type !== 'system') {
        var sender = document.createElement('div');
        sender.className = 'vpn-sup-msg__sender';
        if (msg.sender_type === 'client') {
          sender.textContent = dict.youLabel;
        } else if (msg.sender_type === 'operator') {
          sender.textContent = msg.sender_name || dict.opLabel;
        } else {
          sender.textContent = dict.aiLabel;
        }
        wrap.appendChild(sender);
      }

      var text = document.createElement('div');
      renderFormattedText(text, String(msg.body || ''));
      wrap.appendChild(text);
      bodyEl.appendChild(wrap);
    });

    if (state.sending) {
      var typing = document.createElement('div');
      typing.className = 'vpn-sup-msg vpn-sup-msg--ai';
      typing.textContent = dict.typing;
      bodyEl.appendChild(typing);
    }

    bodyEl.scrollTop = bodyEl.scrollHeight;
    renderQuickChips();
  }

  function mergeMessages(incoming) {
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return;
    }
    var seen = {};
    state.messages.forEach(function (m) {
      if (m.id) seen[m.id] = true;
    });
    incoming.forEach(function (m) {
      if (m.id && seen[m.id]) return;
      if (m.id) {
        seen[m.id] = true;
        if (m.id > state.lastMessageId) state.lastMessageId = m.id;
      }
      state.messages.push(m);
    });
    renderMessages();
  }

  function ensureConversation() {
    if (cfg.webTeaser) {
      return Promise.resolve();
    }
    if (cfg.mode === 'demo') {
      state.initialized = true;
      renderMessages();
      return Promise.resolve();
    }
    if (state.initialized && state.conversationUuid) {
      return Promise.resolve();
    }
    return window.fetch(cfg.apiBase + '/api/v1/support/conversations', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ language: state.lang })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        state.initialized = true;
        if (data.session_token) {
          state.sessionToken = data.session_token;
          safeStorageSet(sessionStorageKey, data.session_token);
        }
        if (data.conversation) {
          state.conversationUuid = data.conversation.uuid;
          state.status = data.conversation.status || 'ai_active';
        }
        state.messages = [];
        state.lastMessageId = 0;
        mergeMessages(data.messages || []);
        renderTranslations();
        renderMessages();
      })
      .catch(function () {
        renderMessages();
      });
  }

  function pollMessages() {
    if (cfg.webTeaser || !state.open || cfg.mode === 'demo' || !state.conversationUuid) {
      return;
    }
    var url = cfg.apiBase + '/api/v1/support/conversations/' + encodeURIComponent(state.conversationUuid)
      + '/messages?after_id=' + String(state.lastMessageId);

    window.fetch(url, { method: 'GET', headers: buildHeaders() })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (data.conversation && data.conversation.status) {
          state.status = data.conversation.status;
          renderTranslations();
        }
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          mergeMessages(data.messages);
        }
      })
      .catch(function () { /* ignore transient poll failures */ });
  }

  function startPolling() {
    if (cfg.webTeaser || state.pollTimer) return;
    state.pollTimer = window.setInterval(pollMessages, 5000);
  }

  function stopPolling() {
    if (state.pollTimer) {
      window.clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function sendText(rawText) {
    if (cfg.webTeaser) return;
    var text = String(rawText || '').trim();
    if (!text || state.sending) return;

    if (cfg.mode === 'demo') {
      state.messages.push({ sender_type: 'client', body: text });
      state.messages.push({
        sender_type: 'ai',
        body: 'Support chat is temporarily offline. Please try again later.'
      });
      renderMessages();
      return;
    }

    state.sending = true;
    sendBtn.disabled = true;
    renderMessages();

    ensureConversation()
      .then(function () {
        if (!state.conversationUuid) {
          throw new Error('No conversation');
        }
        return window.fetch(cfg.apiBase + '/api/v1/support/conversations/' + encodeURIComponent(state.conversationUuid) + '/messages', {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ message: text, language: state.lang })
        });
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error((data && data.error && data.error.message) || 'HTTP ' + res.status);
          }
          return data;
        });
      })
      .then(function (data) {
        state.sending = false;
        sendBtn.disabled = false;
        if (data.conversation && data.conversation.status) {
          state.status = data.conversation.status;
          renderTranslations();
        }
        var batch = [];
        if (data.user_message) batch.push(data.user_message);
        if (data.reply_message) batch.push(data.reply_message);
        mergeMessages(batch);
      })
      .catch(function (err) {
        state.sending = false;
        sendBtn.disabled = false;
        var dict = getDict(state.lang);
        state.messages.push({
          sender_type: 'system',
          body: (err && err.message && err.message !== 'No conversation') ? err.message : dict.errorSend
        });
        renderMessages();
      });
  }

  function requestOperator() {
    if (cfg.webTeaser) return;
    if (cfg.mode === 'demo') {
      state.status = 'waiting_operator';
      renderTranslations();
      return;
    }
    ensureConversation().then(function () {
      if (!state.conversationUuid) return;
      return window.fetch(cfg.apiBase + '/api/v1/support/conversations/' + encodeURIComponent(state.conversationUuid) + '/escalate', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ reason: 'User clicked Operator button in chat widget' })
      })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (!data) return;
          if (data.conversation && data.conversation.status) {
            state.status = data.conversation.status;
            renderTranslations();
          }
          if (data.system_message) {
            mergeMessages([data.system_message]);
          }
        });
    }).catch(function () { /* ignore */ });
  }

  function openWidget() {
    state.open = true;
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    if (cfg.webTeaser) {
      renderTeaser();
      return;
    }
    ensureConversation();
    startPolling();
    input.focus();
  }

  function closeWidget() {
    state.open = false;
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    stopPolling();
  }

  function setTheme(themeVars) {
    applyThemeVars(root, themeVars);
  }

  function reportError(errorCode, message, category) {
    if (cfg.mode === 'demo' || !safeStorageGet(portalTokenKey)) return Promise.resolve();
    return window.fetch(cfg.apiBase + '/api/v1/support/client-errors', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        error_code: String(errorCode || 'CLIENT_ERROR').slice(0, 80),
        message: String(message || 'Client error').slice(0, 500),
        category: category || 'portal',
        platform: 'web',
        conversation_uuid: state.conversationUuid
      })
    }).catch(function () { /* non-blocking telemetry */ });
  }

  teaserDownloadBtn.addEventListener('click', function (event) {
    var target = document.querySelector(cfg.appAnchor);
    if (target) {
      event.preventDefault();
      closeWidget();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      closeWidget();
    }
  });

  fab.addEventListener('click', function () {
    if (state.open) closeWidget();
    else openWidget();
  });
  closeBtn.addEventListener('click', closeWidget);
  opBtn.addEventListener('click', requestOperator);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var val = input.value;
    input.value = '';
    sendText(val);
  });

  document.addEventListener('languagechange', function (event) {
    var nextLang = event && event.detail && event.detail.language
      ? String(event.detail.language).toLowerCase().slice(0, 2)
      : detectLanguage();
    state.lang = I18N[nextLang] ? nextLang : 'en';
    renderTranslations();
    renderMessages();
  });

  renderTranslations();

  var api = {
    open: openWidget,
    close: closeWidget,
    setTheme: setTheme,
    reportError: reportError,
    config: cfg
  };
  window.__VPN_SUPPORT_WIDGET__ = api;
  return api;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initSupportWidget: initSupportWidget,
    renderFormattedText: renderFormattedText,
    resolveConfig: resolveConfig,
    THEME_PRESETS: THEME_PRESETS,
    I18N: I18N,
    BRAND_NAMES: BRAND_NAMES
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initSupportWidget({ brandSlug: 'nordel' }); });
  } else {
    initSupportWidget({ brandSlug: 'nordel' });
  }
}
