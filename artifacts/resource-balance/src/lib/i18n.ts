export type Locale = 'pt' | 'en';

const STORAGE_KEY = 'magites-locale';

type Vars = Record<string, string | number>;

const pt = {
  brand: {
    name: 'Magites Opressoras',
    subtitle: 'Fique rico ou morra tentando',
    loginSubtitle: 'entre para ver seus cenários',
  },
  lang: {
    pt: 'PT',
    en: 'EN',
    switchToPt: 'Usar o site em português',
    switchToEn: 'Use the site in English',
  },
  sync: {
    cloud: 'salvo no Supabase',
    loading: 'sincronizando...',
    local: 'salvo neste dispositivo',
  },
  actions: {
    logout: 'Sair',
    export: 'Exportar',
    import: 'Importar',
    new: 'novo',
    duplicate: 'duplicar',
    rename: 'nome',
    reset: 'limpar',
    delete: 'excluir',
    add: 'adicionar',
    cancel: 'Cancelar',
    saveSource: 'salvar fonte',
    closeEditor: 'Fechar editor',
    deleteAccount: 'excluir conta',
  },
  rail: {
    label: 'Gerenciador de cenários',
    eyebrow: 'Seu atlas',
    title: 'Cenários',
    select: 'Selecionar cenário',
    note: 'Ajuste o ritmo do seu jogo, sem depender de memória. O cenário ativo é salvo',
    noteStrong: ' automaticamente ',
    noteEnd: 'no banco.',
    live: 'saldo vivo, calculado agora',
  },
  hero: {
    reading: 'Leitura do cenário · {name}',
    resourceFallback: 'Seu recurso',
    gaining: 'está ganhando fôlego',
    warning: 'está pedindo atenção',
    copyPositive: 'O ritmo atual acumula saldo. Você pode planejar a próxima sessão com tranquilidade.',
    copyNegative: 'O consumo supera os ganhos. Veja quando a reserva cruza o zero e escolha seu próximo movimento.',
    balanceAfter: 'saldo após {period}',
    inPeriod: '{value} no período',
    recurringGains: 'ganhos recorrentes',
    onceGains: 'ganhos 1x hoje',
    recurringLosses: 'perdas recorrentes',
    onceLosses: 'perdas 1x hoje',
    duration: 'duração',
  },
  setup: {
    eyebrow: 'Ponto de partida',
    title: 'O que você está acompanhando?',
    editable: 'cenário editável',
    resourceName: 'Nome do recurso',
    resourceHelp: 'O nome aparece no resumo e nas projeções.',
    initialBalance: 'Saldo inicial',
    initialHelp: 'Unidades disponíveis agora.',
    period: 'Período de leitura',
    periodHelp: 'Totais de cada fonte são normalizados para este período.',
    currentBalance: 'saldo neste momento',
    baseNote: 'base usada em todas as projeções',
  },
  sources: {
    eyebrow: 'Cadência',
    title: 'Entradas e saídas',
    copy: 'Separe o que se repete do que acontece uma vez. Ganhos e gastos variáveis só aparecem no dia em que foram lançados.',
    active: '{count} fontes ativas',
    recurringGains: 'Ganhos recorrentes',
    onceGains: 'Ganhos variáveis (1x)',
    recurringLosses: 'Perdas recorrentes',
    onceLosses: 'Perdas variáveis (1x)',
    emptyRecurringGains: 'Nenhum ganho recorrente.',
    emptyOnceGains: 'Nenhum ganho variável hoje.',
    emptyRecurringLosses: 'Nenhuma perda recorrente.',
    emptyOnceLosses: 'Nenhuma perda variável hoje.',
    once: 'Uma vez',
    time: 'vez',
    times: 'vezes',
    total: 'Total',
    edit: 'Editar {name}',
    remove: 'Remover {name}',
  },
  day: {
    eyebrow: 'Hoje',
    title: 'Resultado real do dia',
    copy: 'Recorrente diário, variáveis lançadas hoje, semanal no dia em que cai e recorrência maior (ex.: a cada 15 dias) no dia em que cai.',
    gains: 'Ganhos do dia',
    losses: 'Gastos do dia',
    daily: 'Recorrente diário',
    variable: 'Variáveis (hoje)',
    weekly: 'Semanal (hoje)',
    interval: 'A cada N dias (hoje)',
    totalGain: 'Total ganho',
    totalLoss: 'Total gasto',
    net: 'Líquido do dia',
    endOfDay: 'saldo inicial {start} → {end} no fim do dia',
  },
  stats: {
    netPeriod: 'Saldo líquido / período',
    everyPeriod: 'a cada {period}',
    perDay: 'Resultado por dia',
    perDayDetail: 'média linear do ritmo atual',
    timeToZero: 'Tempo até zerar',
    growing: 'crescendo, não há depletion',
    fromBalance: 'a partir do saldo atual',
    rhythm: 'Indicadores de ritmo',
  },
  chart: {
    title: 'Projeção de saldo',
    subtitle: 'Uma linha do tempo sem sustos — e um marco claro quando o saldo cruza o zero.',
    horizon: 'Horizonte da projeção',
    balance: 'Saldo',
    at: 'Em {time}',
    zero: 'zero',
    projected: 'saldo projetado',
    safety: 'linha de segurança',
    zeroIn: 'zero em {time}',
  },
  future: {
    label: 'Projeções futuras',
    long: 'Horizonte longo',
    ifUnchanged: 'Se nada mudar',
    copy: 'Saldo estimado mantendo este mesmo ritmo.',
    inDay: 'em {days} dia',
    inDays: 'em {days} dias',
    whatIf: 'E se...',
    changePace: 'eu mudar o ritmo?',
    simCopy: 'Compare outra rotina de batalhas e atividades sem mexer no cenário base.',
    battles: 'batalhas / dia',
    activities: 'atividades / dia',
    gainAdj: 'ajuste de ganhos %',
    consumeAdj: 'ajuste de consumo %',
    sim30: 'saldo simulado em 30 dias',
    estimated: 'ritmo estimado: {value} por dia',
  },
  table: {
    title: 'Leitura detalhada',
    copy: 'Todos os valores já normalizados para o período selecionado: {period}.',
    source: 'Fonte',
    type: 'Tipo',
    cadence: 'Cadência',
    occurrences: 'Ocorrências',
    totalPeriod: 'Total / período',
    avgMin: 'Média / min',
    gain: 'ganho',
    loss: 'perda',
    variable: 'variável',
    recurring: 'recorrente',
    empty: 'Adicione uma entrada ou saída acima para começar a leitura.',
  },
  modal: {
    edit: 'Editar fonte',
    add: 'Adicionar fonte',
    gainOnce: 'Ganho variável, uma vez.',
    gainRecurring: 'Ganho que se repete.',
    lossOnce: 'Perda variável, uma vez.',
    lossRecurring: 'Perda que se repete.',
    name: 'Nome da fonte',
    gainPlaceholder: 'Nome do ganho',
    lossPlaceholder: 'Nome da perda',
    amount: 'Quantidade por ocorrência',
    occurrences: 'Ocorrências',
    onceHelp: 'Entra só no resultado do dia em que for lançada. Amanhã este item some da lista.',
    frequency: 'Frequência',
    intervalDays: 'A cada quantos dias?',
    intervalHelp: 'Entra no resultado real do dia em que foi cadastrado e de novo a cada {days} dias.',
    formError: 'Informe um nome e valores iguais ou maiores que zero.',
  },
  period: {
    minute: 'Minuto',
    hour: 'Hora',
    day: 'Dia',
    week: 'Semana',
  },
  frequency: {
    once: 'Uma vez',
    minute: 'Por minuto',
    hour: 'Por hora',
    day: 'Por dia',
    week: 'Por semana',
    interval: 'A cada N dias',
    everyDays: 'A cada {days} dias',
  },
  duration: {
    never: 'Nunca',
    now: 'Agora',
    min: '{mins} min',
    week: '{weeks}sem',
  },
  scenario: {
    defaultName: 'Cenário 1',
    newPrompt: 'Nome do novo cenário',
    newName: 'Novo cenário',
    renamePrompt: 'Novo nome para este cenário',
    copySuffix: '{name} — cópia',
    keepOne: 'Mantenha pelo menos um cenário para continuar.',
    deleteConfirm: 'Excluir o cenário “{name}”? Esta ação não pode ser desfeita.',
    removeSource: 'Remover esta fonte do cenário?',
    resetConfirm: 'Limpar este cenário? Ganhos, consumos e saldo voltam a zero.',
    importError: 'Não foi possível importar este arquivo. Verifique se ele é um JSON das Magites Opressoras.',
    exportFile: 'magites-opressoras-cenarios.json',
  },
  footer: 'Magites Opressoras sincroniza os cenários com o Supabase e mantém uma cópia local neste dispositivo.',
  disclaimer: 'Site desenvolvido por “AndreJetx - O Free”, para jogadores. Nenhuma fonte oficial está envolvida — Legends Of Elements',
  login: {
    loading: 'Carregando sua sessão...',
    enter: 'Entrar',
    create: 'Criar conta',
    enterCopy: 'Use o nome de usuário da sua conta para abrir seus cálculos.',
    createCopy: 'Cada pessoa fica com os próprios ganhos, perdas e saldo.',
    username: 'Nome de usuário',
    usernameHelp: 'De 3 a 32 caracteres. Letras, números, ponto, hífen ou underline.',
    password: 'Senha',
    wait: 'Aguarde...',
    noAccount: 'Não tem conta? Criar agora',
    hasAccount: 'Já tem conta? Entrar',
    generic: 'Não foi possível continuar.',
  },
  account: {
    title: 'Excluir conta',
    subtitle: 'Isso apaga seus cenários, ganhos, perdas e o acesso a este usuário. Não dá para desfazer.',
    instruction: 'Para confirmar, digite exatamente a frase abaixo:',
    phrase: 'deletar minha conta',
    placeholder: 'Digite a frase de confirmação',
    confirm: 'Excluir definitivamente',
    mismatch: 'A frase ainda não confere.',
  },
  notFound: {
    code: 'Erro 404',
    title: 'Página não encontrada',
    copy: 'Esse caminho não existe neste cenário.',
  },
  errors: {
    loginFailed: 'Não foi possível entrar.',
    registerFailed: 'Não foi possível criar a conta.',
    emailTaken: 'Este nome de usuário já está em uso.',
    invalidData: 'Dados inválidos.',
    badCredentials: 'Nome de usuário ou senha incorretos.',
    invalidEmail: 'Informe um nome de usuário válido.',
    badEmail: 'Nome de usuário inválido.',
    usernameShort: 'O nome de usuário precisa ter pelo menos 3 caracteres.',
    usernameLong: 'O nome de usuário é longo demais.',
    usernameChars: 'Use letras, números, ponto, hífen ou underline.',
    passwordShort: 'A senha precisa ter pelo menos 6 caracteres.',
    passwordLong: 'A senha é longa demais.',
    passwordInvalid: 'Senha inválida.',
    invalidLogin: 'Resposta de login inválida.',
    authRequired: 'Faça login para continuar.',
    confirmPhrase: 'Digite a frase de confirmação.',
    confirmMismatch: 'A frase de confirmação não confere.',
    deleteFailed: 'Não foi possível excluir a conta.',
  },
};

export type Messages = typeof pt;

const en: Messages = {
  brand: {
    name: 'Magites Oppressors',
    subtitle: 'Get rich or die trying',
    loginSubtitle: 'sign in to see your scenarios',
  },
  lang: {
    pt: 'PT',
    en: 'EN',
    switchToPt: 'Usar o site em português',
    switchToEn: 'Use the site in English',
  },
  sync: {
    cloud: 'saved to Supabase',
    loading: 'syncing...',
    local: 'saved on this device',
  },
  actions: {
    logout: 'Log out',
    export: 'Export',
    import: 'Import',
    new: 'new',
    duplicate: 'duplicate',
    rename: 'rename',
    reset: 'clear',
    delete: 'delete',
    add: 'add',
    cancel: 'Cancel',
    saveSource: 'save source',
    closeEditor: 'Close editor',
    deleteAccount: 'delete account',
  },
  rail: {
    label: 'Scenario manager',
    eyebrow: 'Your atlas',
    title: 'Scenarios',
    select: 'Select scenario',
    note: 'Tune your game pace without relying on memory. The active scenario is saved',
    noteStrong: ' automatically ',
    noteEnd: 'to the database.',
    live: 'live balance, calculated now',
  },
  hero: {
    reading: 'Scenario reading · {name}',
    resourceFallback: 'Your resource',
    gaining: 'is gaining ground',
    warning: 'needs attention',
    copyPositive: 'The current pace is building balance. You can plan the next session with room to spare.',
    copyNegative: 'Consumption outpaces gains. See when the reserve hits zero and pick your next move.',
    balanceAfter: 'balance after {period}',
    inPeriod: '{value} in the period',
    recurringGains: 'recurring gains',
    onceGains: '1x gains today',
    recurringLosses: 'recurring losses',
    onceLosses: '1x losses today',
    duration: 'duration',
  },
  setup: {
    eyebrow: 'Starting point',
    title: 'What are you tracking?',
    editable: 'editable scenario',
    resourceName: 'Resource name',
    resourceHelp: 'The name appears in the summary and projections.',
    initialBalance: 'Starting balance',
    initialHelp: 'Units available right now.',
    period: 'Reading period',
    periodHelp: 'Each source total is normalized to this period.',
    currentBalance: 'balance right now',
    baseNote: 'base used in every projection',
  },
  sources: {
    eyebrow: 'Cadence',
    title: 'Inflows and outflows',
    copy: 'Keep what repeats separate from one-off events. Variable gains and spends only show on the day they were logged.',
    active: '{count} active sources',
    recurringGains: 'Recurring gains',
    onceGains: 'Variable gains (1x)',
    recurringLosses: 'Recurring losses',
    onceLosses: 'Variable losses (1x)',
    emptyRecurringGains: 'No recurring gains.',
    emptyOnceGains: 'No variable gains today.',
    emptyRecurringLosses: 'No recurring losses.',
    emptyOnceLosses: 'No variable losses today.',
    once: 'Once',
    time: 'time',
    times: 'times',
    total: 'Total',
    edit: 'Edit {name}',
    remove: 'Remove {name}',
  },
  day: {
    eyebrow: 'Today',
    title: 'Actual day result',
    copy: 'Daily recurring, variables logged today, weekly on the day it lands, and longer cadence (e.g. every 15 days) on the day it lands.',
    gains: 'Gains today',
    losses: 'Spends today',
    daily: 'Daily recurring',
    variable: 'Variables (today)',
    weekly: 'Weekly (today)',
    interval: 'Every N days (today)',
    totalGain: 'Total gained',
    totalLoss: 'Total spent',
    net: 'Net for the day',
    endOfDay: 'starting balance {start} → {end} by end of day',
  },
  stats: {
    netPeriod: 'Net balance / period',
    everyPeriod: 'every {period}',
    perDay: 'Result per day',
    perDayDetail: 'linear average of the current pace',
    timeToZero: 'Time until zero',
    growing: 'growing, no depletion',
    fromBalance: 'from the current balance',
    rhythm: 'Pace indicators',
  },
  chart: {
    title: 'Balance projection',
    subtitle: 'A timeline without surprises — and a clear mark when the balance crosses zero.',
    horizon: 'Projection horizon',
    balance: 'Balance',
    at: 'At {time}',
    zero: 'zero',
    projected: 'projected balance',
    safety: 'safety line',
    zeroIn: 'zero in {time}',
  },
  future: {
    label: 'Future projections',
    long: 'Long horizon',
    ifUnchanged: 'If nothing changes',
    copy: 'Estimated balance keeping this same pace.',
    inDay: 'in {days} day',
    inDays: 'in {days} days',
    whatIf: 'What if...',
    changePace: 'I change the pace?',
    simCopy: 'Compare another routine of battles and activities without changing the base scenario.',
    battles: 'battles / day',
    activities: 'activities / day',
    gainAdj: 'gains adjustment %',
    consumeAdj: 'consumption adjustment %',
    sim30: 'simulated balance in 30 days',
    estimated: 'estimated pace: {value} per day',
  },
  table: {
    title: 'Detailed reading',
    copy: 'All values already normalized to the selected period: {period}.',
    source: 'Source',
    type: 'Type',
    cadence: 'Cadence',
    occurrences: 'Occurrences',
    totalPeriod: 'Total / period',
    avgMin: 'Avg / min',
    gain: 'gain',
    loss: 'loss',
    variable: 'variable',
    recurring: 'recurring',
    empty: 'Add an inflow or outflow above to start the reading.',
  },
  modal: {
    edit: 'Edit source',
    add: 'Add source',
    gainOnce: 'Variable gain, once.',
    gainRecurring: 'A gain that repeats.',
    lossOnce: 'Variable loss, once.',
    lossRecurring: 'A loss that repeats.',
    name: 'Source name',
    gainPlaceholder: 'Gain name',
    lossPlaceholder: 'Loss name',
    amount: 'Amount per occurrence',
    occurrences: 'Occurrences',
    onceHelp: 'Only counts on the day it is logged. Tomorrow this item leaves the list.',
    frequency: 'Frequency',
    intervalDays: 'Every how many days?',
    intervalHelp: 'Counts on the day it was added and again every {days} days.',
    formError: 'Enter a name and values equal to or greater than zero.',
  },
  period: {
    minute: 'Minute',
    hour: 'Hour',
    day: 'Day',
    week: 'Week',
  },
  frequency: {
    once: 'Once',
    minute: 'Per minute',
    hour: 'Per hour',
    day: 'Per day',
    week: 'Per week',
    interval: 'Every N days',
    everyDays: 'Every {days} days',
  },
  duration: {
    never: 'Never',
    now: 'Now',
    min: '{mins} min',
    week: '{weeks}w',
  },
  scenario: {
    defaultName: 'Scenario 1',
    newPrompt: 'Name of the new scenario',
    newName: 'New scenario',
    renamePrompt: 'New name for this scenario',
    copySuffix: '{name} — copy',
    keepOne: 'Keep at least one scenario to continue.',
    deleteConfirm: 'Delete the scenario “{name}”? This cannot be undone.',
    removeSource: 'Remove this source from the scenario?',
    resetConfirm: 'Clear this scenario? Gains, consumption, and balance go back to zero.',
    importError: 'Could not import this file. Make sure it is a Magites Oppressors JSON.',
    exportFile: 'magites-opressoras-scenarios.json',
  },
  footer: 'Magites Oppressors syncs scenarios with Supabase and keeps a local copy on this device.',
  disclaimer: 'Site developed by “AndreJetx - O Free”, for players. No official sources are involved — Legends Of Elements',
  login: {
    loading: 'Loading your session...',
    enter: 'Sign in',
    create: 'Create account',
    enterCopy: 'Use your username to open your calculations.',
    createCopy: 'Each person keeps their own gains, losses, and balance.',
    username: 'Username',
    usernameHelp: '3 to 32 characters. Letters, numbers, period, hyphen, or underscore.',
    password: 'Password',
    wait: 'Please wait...',
    noAccount: 'No account? Create one now',
    hasAccount: 'Already have an account? Sign in',
    generic: 'Could not continue.',
  },
  account: {
    title: 'Delete account',
    subtitle: 'This erases your scenarios, gains, losses, and access for this user. It cannot be undone.',
    instruction: 'To confirm, type the phrase below exactly:',
    phrase: 'delete my account',
    placeholder: 'Type the confirmation phrase',
    confirm: 'Delete permanently',
    mismatch: 'The phrase does not match yet.',
  },
  notFound: {
    code: 'Error 404',
    title: 'Page not found',
    copy: 'This path does not exist in this scenario.',
  },
  errors: {
    loginFailed: 'Could not sign in.',
    registerFailed: 'Could not create the account.',
    emailTaken: 'This username is already taken.',
    invalidData: 'Invalid data.',
    badCredentials: 'Incorrect username or password.',
    invalidEmail: 'Enter a valid username.',
    badEmail: 'Invalid username.',
    usernameShort: 'Username must be at least 3 characters.',
    usernameLong: 'Username is too long.',
    usernameChars: 'Use letters, numbers, period, hyphen, or underscore.',
    passwordShort: 'Password must be at least 6 characters.',
    passwordLong: 'Password is too long.',
    passwordInvalid: 'Invalid password.',
    invalidLogin: 'Invalid login response.',
    authRequired: 'Sign in to continue.',
    confirmPhrase: 'Enter the confirmation phrase.',
    confirmMismatch: 'The confirmation phrase does not match.',
    deleteFailed: 'Could not delete the account.',
  },
};

export const dictionaries: Record<Locale, Messages> = { pt, en };

const API_ERROR_MAP: Record<string, keyof Messages['errors']> = {};
for (const locale of ['pt', 'en'] as const) {
  for (const key of Object.keys(dictionaries[locale].errors) as (keyof Messages['errors'])[]) {
    API_ERROR_MAP[dictionaries[locale].errors[key]] = key;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'pt' || stored === 'en') return stored;
  } catch {
    // Preview iframes can deny storage.
  }
  return null;
}

function detectLocale(): Locale {
  const stored = typeof window !== 'undefined' ? readStoredLocale() : null;
  if (stored) return stored;
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) return 'en';
  return 'pt';
}

function applyDocument(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale === 'en' ? 'en' : 'pt-BR';
  document.title = dictionaries[locale].brand.name;
  const description = locale === 'en'
    ? 'Magites Oppressors — planner for gains, consumption, and resource projections.'
    : 'Magites Opressoras — planejador de ganhos, consumo e projeções de recursos.';
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
}

let currentLocale: Locale = detectLocale();
applyDocument(currentLocale);

export function getLocale(): Locale {
  return currentLocale;
}

export function localeTag(locale: Locale = currentLocale): string {
  return locale === 'en' ? 'en-US' : 'pt-BR';
}

export function setLocale(next: Locale): void {
  if (next === currentLocale) return;
  currentLocale = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Preview iframes can deny storage.
  }
  applyDocument(next);
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function t(key: string, vars?: Vars, locale: Locale = currentLocale): string {
  const parts = key.split('.');
  let cursor: unknown = dictionaries[locale];
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || !(part in cursor)) {
      cursor = dictionaries.pt;
      for (const fallback of parts) {
        if (!cursor || typeof cursor !== 'object' || !(fallback in cursor)) return key;
        cursor = (cursor as Record<string, unknown>)[fallback];
      }
      break;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === 'string' ? interpolate(cursor, vars) : key;
}

export function translateApiError(message: string, locale: Locale = currentLocale): string {
  const mapped = API_ERROR_MAP[message];
  if (mapped) return t(`errors.${mapped}`, undefined, locale);
  return message;
}
