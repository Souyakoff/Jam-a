// Traduit les erreurs de la console en explications simples pour les débutants.
// Pour ajouter une erreur : ajoute une règle dans RULES (le premier motif qui correspond gagne).

export interface Explanation {
  title: string;
  explanation: string;
  fix: string;
  // Lien vers la doc (MDN en français de préférence)
  link?: string;
  // Erreur sans conséquence, affichée en gris
  harmless?: boolean;
}

type Rule = { pattern: RegExp; explain: (m: RegExpMatchArray) => Explanation };

const MDN_ERRORS = 'https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Errors';

const RULES: Rule[] = [
  {
    pattern: /Failed to load resource:.*status of 404.*|404 \(Not Found\)/i,
    explain: () => ({
      title: 'Fichier introuvable (erreur 404)',
      explanation: 'La page a demandé un fichier (image, script, CSS…) qui n’existe pas à cette adresse sur le serveur.',
      fix: 'Vérifie le chemin du fichier dans ton code : une faute de frappe, une majuscule, ou un dossier oublié (ex. "img/logo.png" au lieu de "images/logo.png").',
      link: 'https://developer.mozilla.org/fr/docs/Web/HTTP/Status/404',
    }),
  },
  {
    pattern: /Failed to load resource:.*status of (401|403)/i,
    explain: (m) => ({
      title: `Accès refusé (erreur ${m[1]})`,
      explanation: m[1] === '401'
        ? 'Le serveur demande d’être connecté (ou une clé d’API) pour donner ce fichier.'
        : 'Le serveur a compris la demande, mais refuse de donner ce fichier.',
      fix: 'Si c’est ton API : vérifie que tu envoies bien le jeton ou la clé (souvent dans l’en-tête "Authorization").',
      link: `https://developer.mozilla.org/fr/docs/Web/HTTP/Status/${m[1]}`,
    }),
  },
  {
    pattern: /Failed to load resource:.*status of (5\d\d)/i,
    explain: (m) => ({
      title: `Le serveur a planté (erreur ${m[1]})`,
      explanation: 'Le problème ne vient pas du navigateur : le serveur a rencontré une erreur en préparant la réponse.',
      fix: 'Si c’est ton serveur, regarde ses logs dans le terminal où il tourne : l’erreur détaillée y est.',
      link: `https://developer.mozilla.org/fr/docs/Web/HTTP/Status/${m[1]}`,
    }),
  },
  {
    pattern: /net::ERR_(NAME_NOT_RESOLVED|CONNECTION_REFUSED|INTERNET_DISCONNECTED|CONNECTION_TIMED_OUT)/i,
    explain: (m) => ({
      title: 'Impossible de joindre le serveur',
      explanation: {
        NAME_NOT_RESOLVED: 'Cette adresse n’existe pas (le nom de domaine est introuvable).',
        CONNECTION_REFUSED: 'Personne ne répond à cette adresse. Sur localhost, ça veut souvent dire que ton serveur n’est pas lancé.',
        INTERNET_DISCONNECTED: 'Tu n’es pas connecté à Internet.',
        CONNECTION_TIMED_OUT: 'Le serveur met trop de temps à répondre.',
      }[m[1].toUpperCase()]!,
      fix: 'Vérifie l’adresse, ta connexion, et que ton serveur de dev tourne bien (ex. "npm run dev").',
    }),
  },
  {
    pattern: /net::ERR_BLOCKED_BY_CLIENT/i,
    explain: () => ({
      title: 'Bloqué par le bloqueur de pubs de Jam<a',
      explanation: 'Ce fichier vient d’un service de pub ou de pistage, alors Jam<a l’a bloqué pour protéger ta vie privée.',
      fix: 'Rien à faire, c’est voulu.',
      harmless: true,
    }),
  },
  {
    pattern: /blocked by CORS policy/i,
    explain: () => ({
      title: 'Requête bloquée par CORS',
      explanation: 'Ta page essaie de lire des données d’un autre site (autre domaine ou autre port). Par sécurité, le navigateur ne l’autorise que si cet autre serveur dit explicitement « oui ».',
      fix: 'C’est le serveur appelé qui doit ajouter l’en-tête "Access-Control-Allow-Origin". Si c’est ton API, active CORS dessus (ex. le paquet "cors" avec Express). Ça ne se corrige pas côté page.',
      link: 'https://developer.mozilla.org/fr/docs/Web/HTTP/CORS',
    }),
  },
  {
    pattern: /Mixed Content/i,
    explain: () => ({
      title: 'Contenu mixte (HTTP dans une page HTTPS)',
      explanation: 'La page est sécurisée (https) mais charge un fichier en http, non sécurisé. Le navigateur le bloque.',
      fix: 'Remplace "http://" par "https://" dans l’adresse du fichier.',
      link: 'https://developer.mozilla.org/fr/docs/Web/Security/Mixed_content',
    }),
  },
  {
    pattern: /Content Security Policy/i,
    explain: () => ({
      title: 'Bloqué par la politique de sécurité (CSP)',
      explanation: 'Le site a une règle de sécurité qui liste les scripts, styles ou images autorisés. Ce fichier n’en fait pas partie.',
      fix: 'Si c’est ton site, ajoute la source dans l’en-tête ou la balise "Content-Security-Policy", ou déplace le code inline dans un fichier .js.',
      link: 'https://developer.mozilla.org/fr/docs/Web/HTTP/CSP',
    }),
  },
  {
    pattern: /Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '([^']+)'\))?/i,
    explain: (m) => ({
      title: `On essaie de lire ${m[2] ? `« .${m[2]} »` : 'une propriété'} sur quelque chose de vide (${m[1]})`,
      explanation: `Ton code fait "quelqueChose.${m[2] ?? 'propriété'}", mais "quelqueChose" vaut ${m[1]} : il n’existe pas (encore).`,
      fix: m[1] === 'null'
        ? 'Souvent, document.querySelector() n’a rien trouvé : vérifie le sélecteur, ou que le script se charge après le HTML (attribut "defer" sur ta balise <script>).'
        : 'Vérifie que la variable a bien une valeur avant de l’utiliser. Astuce : "objet?.propriete" ne plante pas si l’objet est vide.',
      link: `${MDN_ERRORS}/Unexpected_type`,
    }),
  },
  {
    pattern: /Cannot set propert(?:y|ies) of (undefined|null)(?: \(setting '([^']+)'\))?/i,
    explain: (m) => ({
      title: `On essaie de modifier ${m[2] ? `« .${m[2]} »` : 'une propriété'} sur quelque chose de vide (${m[1]})`,
      explanation: `Ton code fait "quelqueChose.${m[2] ?? 'propriété'} = …", mais "quelqueChose" vaut ${m[1]}.`,
      fix: 'Souvent un élément HTML introuvable : vérifie ton sélecteur, et ajoute "defer" à ta balise <script> pour qu’elle s’exécute après le HTML.',
      link: `${MDN_ERRORS}/Unexpected_type`,
    }),
  },
  {
    pattern: /([\w$.]+) is not a function/i,
    explain: (m) => ({
      title: `« ${m[1]} » n’est pas une fonction`,
      explanation: `Tu appelles ${m[1]}(…) comme une fonction, mais ce n’en est pas une (c’est peut-être un texte, un nombre, ou undefined).`,
      fix: 'Vérifie l’orthographe (majuscules comprises), que la bibliothèque est bien chargée, et que tu ne confonds pas une propriété et une méthode.',
      link: `${MDN_ERRORS}/Not_a_function`,
    }),
  },
  {
    pattern: /([\w$]+) is not defined/i,
    explain: (m) => ({
      title: `« ${m[1]} » n’existe pas`,
      explanation: `Le code utilise "${m[1]}", mais cette variable ou fonction n’a jamais été créée là où elle est utilisée.`,
      fix: `Vérifie l’orthographe, que tu l’as déclarée (let, const, function), ou que le script qui la définit est chargé avant. Si c’est une bibliothèque (ex. $ pour jQuery), ajoute sa balise <script>.`,
      link: `${MDN_ERRORS}/Not_defined`,
    }),
  },
  {
    pattern: /Cannot access '([^']+)' before initialization/i,
    explain: (m) => ({
      title: `« ${m[1]} » est utilisée trop tôt`,
      explanation: `La variable "${m[1]}" est déclarée avec let ou const plus bas dans le code, mais on s’en sert avant cette ligne.`,
      fix: 'Déplace la déclaration avant la ligne qui l’utilise.',
      link: `${MDN_ERRORS}/Cant_access_lexical_declaration_before_init`,
    }),
  },
  {
    pattern: /Assignment to constant variable/i,
    explain: () => ({
      title: 'On modifie une constante',
      explanation: 'Une variable déclarée avec "const" ne peut pas recevoir une nouvelle valeur.',
      fix: 'Remplace "const" par "let" si la valeur doit changer.',
      link: `${MDN_ERRORS}/Invalid_const_assignment`,
    }),
  },
  {
    pattern: /Maximum call stack size exceeded/i,
    explain: () => ({
      title: 'Boucle infinie de fonctions',
      explanation: 'Une fonction s’appelle elle-même (directement ou non) sans jamais s’arrêter.',
      fix: 'Vérifie la condition d’arrêt de ta fonction récursive, ou un setter qui se modifie lui-même.',
      link: `${MDN_ERRORS}/Too_much_recursion`,
    }),
  },
  {
    pattern: /is not valid JSON|JSON\.parse|Unexpected token '?<'?.*JSON/i,
    explain: () => ({
      title: 'Ce n’est pas du JSON valide',
      explanation: 'Le code essaie de lire du JSON, mais le texte reçu n’en est pas. Très souvent, le serveur a renvoyé une page HTML d’erreur (qui commence par "<").',
      fix: 'Ouvre l’adresse de l’API directement dans un onglet pour voir ce qu’elle renvoie vraiment, et vérifie l’URL appelée par fetch().',
      link: `${MDN_ERRORS}/JSON_bad_parse`,
    }),
  },
  {
    pattern: /Failed to fetch/i,
    explain: () => ({
      title: 'La requête fetch() a échoué',
      explanation: 'Le navigateur n’a pas réussi à contacter le serveur : adresse fausse, serveur éteint, ou blocage CORS.',
      fix: 'Regarde les autres erreurs juste à côté (souvent une erreur CORS ou réseau qui donne la vraie raison).',
      link: 'https://developer.mozilla.org/fr/docs/Web/API/Fetch_API/Using_Fetch',
    }),
  },
  {
    pattern: /Unexpected end of input/i,
    explain: () => ({
      title: 'Le code s’arrête trop tôt',
      explanation: 'Il manque une fermeture : une accolade }, une parenthèse ) ou un guillemet.',
      fix: 'Vérifie que chaque { ( [ ou " ouvert est bien refermé. Ton éditeur peut surligner les paires.',
      link: `${MDN_ERRORS}/Missing_curly_after_function_body`,
    }),
  },
  {
    pattern: /Unexpected token|SyntaxError/i,
    explain: () => ({
      title: 'Erreur de syntaxe',
      explanation: 'Le navigateur n’arrive pas à lire le code : un caractère n’est pas à sa place.',
      fix: 'Regarde la ligne indiquée et celle juste avant : souvent une virgule, une parenthèse ou un guillemet en trop ou manquant.',
      link: `${MDN_ERRORS}/Unexpected_token`,
    }),
  },
  {
    pattern: /Uncaught \(in promise\)/i,
    explain: () => ({
      title: 'Erreur dans une promesse non gérée',
      explanation: 'Une opération asynchrone (fetch, async/await…) a échoué, et rien dans le code ne gère l’échec.',
      fix: 'Entoure ton "await" d’un try { … } catch (erreur) { … }, ou ajoute .catch() après la promesse.',
      link: 'https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Using_promises',
    }),
  },
  {
    pattern: /\[DOM\].*autocomplete|deprecated|is deprecated/i,
    explain: () => ({
      title: 'Fonctionnalité dépréciée',
      explanation: 'Le code utilise quelque chose qui marche encore, mais qui va disparaître des navigateurs.',
      fix: 'Pas urgent, mais cherche l’alternative moderne indiquée dans le message.',
      harmless: true,
    }),
  },
];

export function explain(message: string, source = ''): Explanation {
  // Le navigateur demande toujours /favicon.ico : son absence n'est pas un vrai problème
  if (/status of 404/.test(message) && /\/favicon\.ico(\?|$)/i.test(source)) {
    return {
      title: 'Pas d’icône pour ce site (favicon.ico)',
      explanation: 'Le navigateur cherche automatiquement une petite icône pour l’onglet, et ce site n’en a pas.',
      fix: 'Sans gravité. Pour en ajouter une : <link rel="icon" href="mon-icone.png"> dans le <head>.',
      harmless: true,
    };
  }
  for (const rule of RULES) {
    const match = message.match(rule.pattern);
    if (match) return rule.explain(match);
  }
  // Sans « Uncaught », c'est le code du site qui a écrit ce message lui-même
  if (!/^Uncaught/.test(message)) {
    return {
      title: 'Message écrit par le code du site',
      explanation: 'Ce n’est pas le navigateur qui se plaint : le code de la page a lui-même affiché ce message, avec console.error() ou console.warn().',
      fix: 'Lis le message original ci-dessous. Si c’est ton code, cherche ce texte dans tes fichiers pour trouver d’où il vient.',
      link: 'https://developer.mozilla.org/fr/docs/Web/API/console/error_static',
    };
  }
  return {
    title: 'Erreur non reconnue',
    explanation: 'Jam<a ne connaît pas encore cette erreur. Le message original est juste en dessous.',
    fix: 'Copie le message dans un moteur de recherche, et regarde la ligne indiquée dans les outils de développement (F12).',
    link: `https://duckduckgo.com/?q=${encodeURIComponent(`javascript ${message.slice(0, 120)}`)}`,
  };
}
