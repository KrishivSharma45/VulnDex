// Hand-written seed content. Scores, summaries and affected software come from NVD (see seed.ts).

export const cardSets = [
  {slug: 'legendary-breaches', title: 'Legendary Breaches', themeColor: '#f5b301',
    description: 'The bugs that made the evening news and kept CISOs up for a decade.'},
  {slug: 'windows-woes', title: 'Windows Woes', themeColor: '#2f7cf6',
    description: 'SMB, RDP, Netlogon and the print spooler: a tour of Redmond’s haunted house.'},
  {slug: 'web-apocalypse', title: 'Web Apocalypse', themeColor: '#e5484d',
    description: 'One crafted HTTP request away from owning the box.'},
  {slug: 'hardware-haunts', title: 'Hardware Haunts', themeColor: '#8e4ec6',
    description: 'When the silicon itself leaks secrets. No patch Tuesday can fully exorcise these.'},
  {slug: 'linux-lore', title: 'Linux Lore', themeColor: '#30a46c',
    description: 'Kernel races and daemon regressions from the land of the penguin.'},
] as const

export const attackTypes = [
  {slug: 'rce', name: 'Remote Code Execution',
    description: 'An attacker runs arbitrary code on a target system over the network.'},
  {slug: 'memory-disclosure', name: 'Memory Disclosure',
    description: 'Leaks the contents of memory: keys, passwords, session data.'},
  {slug: 'privilege-escalation', name: 'Privilege Escalation',
    description: 'Turns limited access into admin, root or SYSTEM.'},
  {slug: 'side-channel', name: 'Side-Channel',
    description: 'Infers secrets from timing, caches or other physical behaviour rather than a logic bug.'},
  {slug: 'auth-bypass', name: 'Authentication Bypass',
    description: 'Gets in without valid credentials.'},
] as const

type SetSlug = (typeof cardSets)[number]['slug']
type AttackSlug = (typeof attackTypes)[number]['slug']

export type CardSeed = {
  cveId: string
  nickname: string
  set: SetSlug
  attackTypes: AttackSlug[]
  story: string[] // one paragraph per entry
  patchInfo: string
}

export const cards: CardSeed[] = [
  {
    cveId: 'CVE-2014-0160', nickname: 'Heartbleed', set: 'legendary-breaches', attackTypes: ['memory-disclosure'],
    story: [
      'A TLS heartbeat says "send me back these 5 letters: HAT". Heartbleed said "send me back these 64,000 letters: HAT", and OpenSSL obligingly shipped back whatever happened to be lying around in memory, private keys included.',
      'It was the first bug with a logo, a website and a brand. Half the internet rotated its certificates in a week.',
    ],
    patchInfo: 'Fixed in OpenSSL 1.0.1g (April 2014). After upgrading, revoke and reissue TLS certificates, rotate private keys and reset session secrets.',
  },
  {
    cveId: 'CVE-2014-6271', nickname: 'Shellshock', set: 'web-apocalypse', attackTypes: ['rce'],
    story: [
      'Bash had a cute trick: you could export functions through environment variables. It also kept executing whatever came after the function definition. Any CGI script that passed an HTTP header into an env var was suddenly a remote shell.',
      'The "() { :; };" incantation became the most-sprayed string on the internet for months.',
    ],
    patchInfo: 'Patched in Bash 4.3 patch 25 and backports; the first fix was incomplete, so apply the follow-up patches (CVE-2014-7169 and friends). Update bash from your distro.',
  },
  {
    cveId: 'CVE-2017-0144', nickname: 'EternalBlue', set: 'legendary-breaches', attackTypes: ['rce'],
    story: [
      'An exploit allegedly built by the NSA, leaked by the Shadow Brokers, then strapped to WannaCry and NotPetya. One malformed SMBv1 packet and Windows hands over SYSTEM.',
      'Hospitals, shipping giants and car factories went dark in a weekend. Still found on unpatched networks years later.',
    ],
    patchInfo: 'Microsoft bulletin MS17-010 (March 2017), with emergency patches for Windows XP and Server 2003 in May 2017. Disable SMBv1 and block TCP 445 at the perimeter.',
  },
  {
    cveId: 'CVE-2021-44228', nickname: 'Log4Shell', set: 'legendary-breaches', attackTypes: ['rce'],
    story: [
      'Log a string, get pwned. Log4j helpfully expanded ${jndi:ldap://...} lookups inside log messages, so a username, a chat message or a User-Agent could make a Java server fetch and run attacker code.',
      'Discovered via Minecraft chat. Spent the 2021 holidays ruining everyone’s holidays.',
    ],
    patchInfo: 'Upgrade Log4j 2 to 2.17.1+ (Java 8), 2.12.4 (Java 7) or 2.3.2 (Java 6). Early fixes 2.15.0 and 2.16.0 were incomplete. Stop-gap: remove JndiLookup.class from the classpath.',
  },
  {
    cveId: 'CVE-2017-5754', nickname: 'Meltdown', set: 'hardware-haunts', attackTypes: ['side-channel', 'memory-disclosure'],
    story: [
      'The CPU checks whether you may read kernel memory, but out-of-order execution reads it first and asks questions later. The answer gets thrown away; its footprint in the cache does not.',
      'Any user process could read kernel memory at hundreds of KB per second. Every OS vendor rewrote its memory layout over one winter.',
    ],
    patchInfo: 'Mitigated in software by Kernel Page Table Isolation (KPTI/KAISER on Linux, KVA Shadow on Windows), shipped January 2018. Fixed in silicon on later Intel generations.',
  },
  {
    cveId: 'CVE-2017-5753', nickname: 'Spectre', set: 'hardware-haunts', attackTypes: ['side-channel', 'memory-disclosure'],
    story: [
      'Train the branch predictor, then let speculative execution read out of bounds on your behalf. The CPU rolls back the instructions but not the cache, and a timing measurement recovers the secret.',
      'Named because it would haunt us for a long time. It has.',
    ],
    patchInfo: 'No single patch. Mitigations include speculation barriers (LFENCE), array-index masking in compilers and kernels, site isolation in browsers and coarser timers in JavaScript.',
  },
  {
    cveId: 'CVE-2019-0708', nickname: 'BlueKeep', set: 'windows-woes', attackTypes: ['rce'],
    story: [
      'A use-after-free in Remote Desktop Services, reachable before login. Microsoft found it so worrying it shipped patches for Windows XP, five years after end of support.',
      'Everyone braced for "WannaCry 2". It mostly became a cryptominer’s side hustle, but a million exposed RDP hosts made it a very tense summer.',
    ],
    patchInfo: 'Fixed in the May 2019 Patch Tuesday, including out-of-support XP and Server 2003. Enable Network Level Authentication and keep RDP off the public internet.',
  },
  {
    cveId: 'CVE-2016-5195', nickname: 'Dirty COW', set: 'linux-lore', attackTypes: ['privilege-escalation'],
    story: [
      'A race in the kernel’s copy-on-write handling let an unprivileged user scribble on read-only files, like /etc/passwd or a setuid binary. Two threads, one madvise loop, instant root.',
      'The bug had been in the kernel for nine years. Linus admitted he had tried to fix it once before.',
    ],
    patchInfo: 'Fixed upstream in October 2016 (kernels 4.8.3, 4.7.9, 4.4.26 and distro backports). Update the kernel and reboot, or use live patching.',
  },
  {
    cveId: 'CVE-2020-1472', nickname: 'Zerologon', set: 'windows-woes', attackTypes: ['auth-bypass', 'privilege-escalation'],
    story: [
      'Netlogon used AES-CFB8 with an all-zero IV. Send all zeros and roughly one try in 256 the "encrypted" answer is also all zeros. A few seconds of retries and you can reset the domain controller’s own password.',
      'From an unauthenticated foothold to Domain Admin, powered by the number zero.',
    ],
    patchInfo: 'Patched in August 2020 Patch Tuesday; enforcement of secure RPC for Netlogon became mandatory in February 2021. Patch every domain controller.',
  },
  {
    cveId: 'CVE-2021-34527', nickname: 'PrintNightmare', set: 'windows-woes', attackTypes: ['rce', 'privilege-escalation'],
    story: [
      'Researchers published a proof of concept thinking it was already patched. It was not. The Windows Print Spooler would load a "printer driver" DLL from anywhere, as SYSTEM, on domain controllers too.',
      'The advice for a while was simply: turn off printing.',
    ],
    patchInfo: 'Out-of-band update KB5004945 (July 2021) plus later hardening. Disable the Print Spooler where it is not needed and set RestrictDriverInstallationToAdministrators = 1.',
  },
  {
    cveId: 'CVE-2022-22965', nickname: 'Spring4Shell', set: 'web-apocalypse', attackTypes: ['rce'],
    story: [
      'Spring’s data binding let request parameters walk the object graph, all the way to class.module.classLoader and Tomcat’s logging config. Rewrite the access log as a JSP web shell, then request it.',
      'Its name and timing made everyone fear Log4Shell 2.0. It needed JDK 9+, a WAR on Tomcat and a specific binding pattern, but plenty of apps matched.',
    ],
    patchInfo: 'Fixed in Spring Framework 5.3.18 and 5.2.20 (Spring Boot 2.6.6 / 2.5.12), March 2022. Tomcat 10.0.20, 9.0.62 and 8.5.78 also closed the attack path.',
  },
  {
    cveId: 'CVE-2024-6387', nickname: 'regreSSHion', set: 'linux-lore', attackTypes: ['rce'],
    story: [
      'A signal-handler race in sshd that was fixed in 2006, then came back in 2020 when a logging change removed the guard. Hit the login grace timeout at exactly the right moment and glibc’s heap is yours, as root.',
      'Winning the race takes hours of attempts, but OpenSSH runs on millions of internet-facing servers.',
    ],
    patchInfo: 'Fixed in OpenSSH 9.8p1 (July 2024). Workaround: set LoginGraceTime 0 in sshd_config (prevents RCE but risks connection exhaustion).',
  },
]
