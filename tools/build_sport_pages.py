"""Génère /handball/ et /sports-de-combat/ à partir de /preparation-physique/.

Usage : python3 tools/build_sport_pages.py  (depuis la racine du dépôt)
Le gabarit garde le design, l'en-tête, les offres Performance, les outils et le pied de page.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = (ROOT / "preparation-physique" / "index.html").read_text(encoding="utf-8")
BILAN = "../bilan-offert/"


def section(html, start_marker, end_marker):
    i = html.index(start_marker)
    j = html.index(end_marker, i)
    return i, j


def replace_between(html, start_marker, end_marker, new):
    i, j = section(html, start_marker, end_marker)
    return html[:i] + new + html[j:]


def tiles(items):
    return "\n".join(
        f'<article class="tile"><span class="tile-index">0{n} / {k}</span><h3>{t}</h3><p>{p}</p></article>'
        for n, (k, t, p) in enumerate(items, 1)
    )


def process(items):
    return "\n".join(f"<li><strong>{t}</strong><p>{p}</p></li>" for t, p in items)


def faq(items):
    return "\n".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in items)


ICONS = {
    "bolt": '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    "shield": '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    "pulse": '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    "target": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    "timer": '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    "loop": '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
}


def icon(name):
    return ('<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>')


def rich_sections(cfg):
    stats = "".join(f'<div class="sp-stat"><strong>{a}</strong><span>{b}</span></div>' for a, b in cfg["stats"])
    quals = "".join(
        f'<article class="sp-qual"><span class="sp-qual-icon">{icon(i)}</span><h3>{t}</h3><p>{d}</p></article>'
        for i, t, d in cfg["qualities"])
    week = "".join(
        f'<li class="sp-day {k}"><span class="sp-day-name">{d}</span><span class="sp-day-chip">{l}</span><small>{n}</small></li>'
        for d, l, k, n in cfg["week"])
    return f'''<section class="sp-stats" aria-label="AK PRIME en bref"><div class="shell sp-stats-inner">{stats}</div></section>
<section class="section section-dark sp-quals-section" id="qualites">
  <div class="shell">
    <div class="section-heading"><span class="kicker">CE QU’ON TRAVAILLE</span><h2>{cfg['qual_h2']}</h2><p>{cfg['qual_p']}</p></div>
    <div class="sp-quals">{quals}</div>
  </div>
</section>
<section class="section section-light sp-week-section" id="semaine-type">
  <div class="shell">
    <div class="section-heading"><span class="kicker">EXEMPLE DE SEMAINE TYPE</span><h2>{cfg['week_h2']}</h2><p>{cfg['week_p']}</p></div>
    <ol class="sp-week">{week}</ol>
    <div class="sp-legend"><span class="club">Séance de club</span><span class="prep">Prépa AK PRIME</span><span class="key">{cfg['week_key']}</span><span class="rest">Récupération</span></div>
    <p class="callout-line">Exemple indicatif : votre semaine est construite selon votre calendrier, votre niveau et votre formule.</p>
  </div>
</section>
'''


def build(cfg):
    html = TEMPLATE
    url = f"https://akprime.fr/{cfg['slug']}/"

    # --- En-tête : title, description, canonical, Open Graph, données structurées
    html = re.sub(r"<title>.*?</title>", f"<title>{cfg['title']}</title>", html, count=1)
    html = html.replace("https://akprime.fr/preparation-physique/", url)
    html = re.sub(r'(<meta name="description" content=")[^"]*', r"\g<1>" + cfg["description"], html)
    html = re.sub(r'(<meta property="og:title" content=")[^"]*', r"\g<1>" + cfg["title"], html)
    html = re.sub(r'(<meta property="og:description" content=")[^"]*', r"\g<1>" + cfg["description"], html)
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebPage", "@id": url + "#page", "url": url, "name": cfg["title"],
             "description": cfg["description"], "inLanguage": "fr-FR",
             "isPartOf": {"@id": "https://akprime.fr/#site"}, "about": {"@id": url + "#service"}},
            {"@type": "Service", "@id": url + "#service", "name": cfg["service_name"],
             "serviceType": cfg["service_type"], "description": cfg["description"], "url": url,
             "availableLanguage": "fr", "provider": {"@id": "https://akprime.fr/#organisation"},
             "areaServed": {"@type": "Country", "name": "France"}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "AK PRIME", "item": "https://akprime.fr/"},
                {"@type": "ListItem", "position": 2, "name": "Préparation physique", "item": "https://akprime.fr/preparation-physique/"},
                {"@type": "ListItem", "position": 3, "name": cfg["crumb"], "item": url}]},
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                for q, a in cfg["faq"]]},
        ],
    }
    html = re.sub(r'<script type="application/ld\+json">.*?</script>',
                  '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>",
                  html, count=1, flags=re.S)

    # --- Héros
    hero = f'''<section class="hero" aria-labelledby="main-title">
  <div class="shell hero-grid">
    <div class="hero-copy">
      <div class="breadcrumb"><a href="../">AK PRIME</a><span aria-hidden="true">/</span><a href="../preparation-physique/">Préparation physique</a><span aria-hidden="true">/</span><span>{cfg['crumb']}</span></div>
      <span class="eyebrow">{cfg['eyebrow']}</span>
      <h1 id="main-title">{cfg['h1']}<span>{cfg['h1_span']}</span></h1>
      <p class="hero-lede">{cfg['lede']}</p>
      <div class="cta-row"><a class="btn btn-primary" href="{BILAN}">Réserver mon bilan offert <span aria-hidden="true">↗</span></a><a class="btn btn-outline" href="#offres">Voir les formules</a></div>
      <p class="hero-note">{cfg['hero_note']}</p>
    </div>
    <div class="sp-hero-media">
      <div class="sp-frame {cfg.get('frame_class','')}">{cfg['hero_media']}</div>
      <div class="sp-float"><span class="tag">{cfg['art_tag']}</span><strong>{cfg['art_text']}</strong></div>
    </div>
  </div>
</section>
'''
    html = replace_between(html, '<section class="hero"', '<div class="trust-strip"', hero)

    trust = '<div class="trust-strip" aria-label="Les références d’AK PRIME"><div class="shell trust-inner">\n' + "\n".join(
        f'<div class="trust-item"><strong>{s}</strong><span>{t}</span></div>' for s, t in cfg["trust"]) + "\n</div></div>\n"
    html = replace_between(html, '<div class="trust-strip"', '<section class="section section-light" id="pour-qui">', trust)
    html = html.replace('<section class="section section-light" id="pour-qui">', rich_sections(cfg) + '<section class="section section-light" id="pour-qui">', 1)
    html = html.replace('<link rel="stylesheet" href="../akp-ga4-consent.css?v=1">', '<link rel="stylesheet" href="../akp-ga4-consent.css?v=1">\n<link rel="stylesheet" href="../assets/akp-sport.css?v=2">', 1)

    pour_qui = f'''<section class="section section-light" id="pour-qui">
  <div class="shell">
    <div class="section-heading"><span class="kicker">À QUI S’ADRESSE CET ACCOMPAGNEMENT ?</span><h2>{cfg['who_h2']}</h2><p>{cfg['who_p']}</p></div>
    <div class="tile-grid">{tiles(cfg['tiles'])}</div>
    <p class="callout-line">Une démarche personnalisée, jamais une promesse de résultat identique pour tous.</p>
  </div>
</section>
'''
    html = replace_between(html, '<section class="section section-light" id="pour-qui">', '<section class="section section-dark" id="methode">', pour_qui)

    methode = f'''<section class="section section-dark" id="methode">
  <div class="shell">
    <div class="section-heading"><span class="kicker">LA MÉTHODE AK PRIME</span><h2>{cfg['method_h2']}</h2><p>{cfg['method_p']}</p></div>
    <ol class="process">{process(cfg['process'])}</ol>
  </div>
</section>
'''
    html = replace_between(html, '<section class="section section-dark" id="methode">', '<section class="section section-muted" id="coach">', methode)

    html = re.sub(r'(<span class="kicker">LE COACH · FONDATEUR AK PRIME</span><h2>Alex Kieffer</h2><p>).*?(</p>)',
                  lambda m: m.group(1) + cfg["coach"] + m.group(2), html, count=1, flags=re.S)

    html = html.replace(
        '<p class="offer-note">',
        f'<p class="offer-note"><strong style="color:#fff">Vous hésitez entre deux formules ?</strong> Le <a href="{BILAN}">bilan découverte offert de 20 min</a> sert justement à choisir ensemble, sans engagement. ',
        1)

    if cfg.get('gallery'):
        html = html.replace('<section class="section section-muted" id="coach">', cfg['gallery'] + '<section class="section section-muted" id="coach">', 1)

    faq_block = f'''<section class="section section-light" id="faq" style="padding-top:12px">
  <div class="shell">
    <div class="section-heading"><span class="kicker">QUESTIONS FRÉQUENTES</span><h2>{cfg['faq_h2']}</h2><p>Les réponses aux questions que se posent le plus souvent les sportifs avant de commencer.</p></div>
    <div class="faq-list">{faq(cfg['faq'])}</div>
  </div>
</section>
'''
    html = replace_between(html, '<section class="section section-light" id="faq"', '<section class="final-cta">', faq_block)

    final = f'''<section class="final-cta">
  <div class="shell final-inner"><div><span class="kicker">BILAN DÉCOUVERTE OFFERT · 20 MIN</span><h2>{cfg['final_h2']}</h2><p>{cfg['final_p']}</p></div><div class="cta-row"><a class="btn btn-primary" href="{BILAN}">Réserver mon créneau <span aria-hidden="true">↗</span></a><a class="btn btn-outline" href="#offres">Comparer les formules</a></div></div>
</section>
'''
    html = replace_between(html, '<section class="final-cta">', "</main>", final)

    html = html.replace(
        '<div class="other-poles" aria-label="Découvrir les autres pôles AK PRIME">',
        '<div class="other-poles" aria-label="Découvrir les autres pôles AK PRIME">' + cfg["other_links"], 1)

    out = ROOT / cfg["slug"] / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print("écrit", out.relative_to(ROOT), len(html), "octets")


HANDBALL = {
    "slug": "handball",
    "crumb": "Handball",
    "title": "Préparateur physique handball à distance | AK PRIME",
    "description": "Préparation physique handball à distance : explosivité, vitesse, prévention des blessures et retour au jeu. Programme individualisé autour de vos entraînements et matchs, par un préparateur diplômé STAPS.",
    "service_name": "Préparation physique handball à distance",
    "service_type": "Préparation physique individualisée pour handballeurs et handballeuses",
    "eyebrow": "HANDBALL · PRÉPARATION PHYSIQUE À DISTANCE",
    "h1": "Préparation physique handball.",
    "h1_span": "Plus explosif, plus solide, toute la saison.",
    "lede": "Duels, appuis, sprints répétés, tirs en suspension : le handball sollicite énormément le corps. AK PRIME construit votre préparation autour de vos entraînements de club, de vos matchs et de votre poste, pour progresser sans vous cramer.",
    "hero_note": "Expérience en handball à Palente Besançon (niveau national) · Master STAPS · 100 % à distance",
    "hero_media": '<img src="../assets/media/palente-victoire.webp" alt="L’équipe de Palente Besançon Handball réunie après une victoire à Besançon" width="840" height="660" fetchpriority="high" decoding="async">',
    "frame_class": "wide",
    "stats": [("Master 2", "STAPS · entraînement et performance"), ("N2", "montée invaincue avec Palente"), ("100 %", "à distance, partout en France"), ("20 min", "bilan découverte offert")],
    "qual_h2": "Les qualités qui font la différence sur un terrain de hand.",
    "qual_p": "Chaque programme part de votre poste et de vos besoins : on travaille ce qui vous fera gagner des duels, pas des kilos sur une machine.",
    "qualities": [
        ("bolt", "Explosivité", "Détente, premiers appuis, puissance de tir en suspension."),
        ("timer", "Vitesse et répétition", "Sprints courts répétés, replis défensifs, montées de balle."),
        ("shield", "Solidité dans les duels", "Force, gainage et contacts pour encaisser et gagner les un-contre-un."),
        ("loop", "Changements de direction", "Appuis, freinages et relances, en sécurité pour les genoux et les chevilles."),
        ("pulse", "Tenir toute la saison", "Gestion de la charge entre club, matchs et prépa, pour arriver frais le week-end."),
        ("target", "Retour de blessure", "Réathlétisation progressive jusqu’aux exigences du terrain, en lien avec votre kiné."),
    ],
    "week_h2": "Votre prépa s’organise autour du club, pas l’inverse.",
    "week_p": "Les séances AK PRIME se placent là où elles vous font progresser sans vous fatiguer avant le match.",
    "week_key": "Match",
    "week": [
        ("Lun", "Récup", "rest", "Mobilité, récupération active"),
        ("Mar", "Club", "club", "Entraînement collectif"),
        ("Mer", "Force", "prep", "Force et puissance, 45 min"),
        ("Jeu", "Club", "club", "Entraînement collectif"),
        ("Ven", "Activation", "prep", "Vitesse et activation, 20 min"),
        ("Sam", "Match", "key", "Le jour J"),
        ("Dim", "Repos", "rest", "Repos complet"),
    ],
    "art_tag": "VICTOIRE · PALENTE",
    "art_text": "Palente Besançon Handball : montée en N2 sans perdre un match.",
    "trust": [
        ("Palente Besançon Handball", "Prépa physique et mentale · montée en N2 sans perdre un match"),
        ("Championnes de France UNSS 2026", "Section handball Stendhal"),
        ("Master STAPS", "Entraînement et optimisation de la performance"),
    ],
    "who_h2": "Vous jouez en club et voulez passer un cap.",
    "who_p": "Nationale, prénationale ou championnat régional : l’entraînement collectif ne laisse pas toujours le temps de travailler votre physique de façon individualisée. C’est là qu’AK PRIME intervient, en complément de votre coach.",
    "tiles": [
        ("OBJECTIF", "Gagner en explosivité", "Détente, vitesse sur les premiers appuis, puissance de tir et engagement dans les duels."),
        ("OBJECTIF", "Tenir toute la saison", "Gérer la charge entre entraînements et matchs pour rester performant jusqu’aux derniers matchs."),
        ("OBJECTIF", "Revenir après une blessure", "Réathlétisation progressive après une blessure (genou, cheville, épaule), en lien avec les indications de votre kiné ou de votre médecin."),
    ],
    "method_h2": "Une préparation pensée pour le hand.<br>Pas un programme de salle générique.",
    "method_p": "Chaque cycle tient compte de votre poste, de votre calendrier de matchs et de vos séances de club. L’objectif : arriver frais le week-end et progresser semaine après semaine.",
    "process": [
        ("Comprendre", "Poste, niveau, volume d’entraînement en club, historique de blessures, objectifs de la saison."),
        ("Évaluer", "Tests réalisables à distance selon votre matériel : sauts, vitesse, force, lorsque c’est pertinent."),
        ("Planifier", "Séances placées autour des entraînements et des matchs, avec des cycles adaptés à la saison et à la trêve."),
        ("Suivre", "Retours après chaque séance et suivi de la fatigue pour éviter la surcharge."),
        ("Adapter", "Ajustements selon les matchs, la fatigue et les retests, avec analyse vidéo selon la formule."),
    ],
    "coach": "Diplômé d’un Master STAPS en entraînement et optimisation de la performance sportive, Alex Kieffer a notamment travaillé en handball à Palente Besançon (montée en N2 sans perdre un match) et avec la section handball Stendhal, championne de France UNSS 2026. Il a aussi assuré la préparation physique de l’équipe pro féminine de football de Thonon Évian Grand Genève (Seconde Ligue) et de boxeurs jusqu’au niveau pro.",
    "faq_h2": "Préparation physique handball : vos questions.",
    "faq": [
        ("Je m’entraîne déjà 3 fois par semaine en club, est-ce que je peux en faire plus ?", "Oui, si c’est bien dosé. Le programme est construit autour de vos séances de club et de vos matchs : le volume, l’intensité et le placement des séances sont choisis pour vous faire progresser sans ajouter de fatigue inutile avant le week-end."),
        ("Mon club a déjà un entraîneur, à quoi servez-vous ?", "AK PRIME vient en complément de votre entraîneur, pas à sa place. Le coach du club gère la tactique, la technique et le collectif ; la préparation physique individualisée travaille vos besoins à vous : explosivité, appuis, gainage, prévention des blessures."),
        ("Je reviens d’une blessure (genou, cheville, épaule), est-ce adapté ?", "Oui, la formule Performance & Réathlétisation est prévue pour ça : reprise progressive, réathlétisation et retour aux exigences du terrain. Le coaching ne remplace pas la rééducation : les indications de votre kiné ou de votre médecin sont prises en compte."),
        ("De quel matériel ai-je besoin ?", "Le programme s’adapte à ce que vous avez : salle de musculation, matériel du club ou simple matériel à la maison. Les séances sont construites en fonction de vos moyens réels."),
        ("Comment ça se passe à distance ?", "Vos séances sont sur l’application Optitrainer, vous faites vos retours après chaque séance, et nous faisons le point en visio selon votre formule. Vous pouvez envoyer des vidéos pour une analyse technique."),
        ("Combien ça coûte ?", "Les formules Performance démarrent à 99 € par mois, avec un engagement minimum de 3 mois pour laisser le temps à la progression. Le bilan découverte de 20 minutes est offert et sans engagement."),
    ],
    "final_h2": "Parlons de votre saison.",
    "final_p": "20 minutes en visio pour faire le point sur votre niveau, vos objectifs et la formule la plus adaptée. Gratuit et sans engagement.",
    "other_links": '<a href="../sports-de-combat/">Sports de combat <span aria-hidden="true">↗</span></a><a href="../preparation-physique/">Préparation physique <span aria-hidden="true">↗</span></a>',
}

COMBAT = {
    "slug": "sports-de-combat",
    "crumb": "Sports de combat",
    "title": "Préparation physique boxe et sports de combat à distance | AK PRIME",
    "description": "Préparation physique pour la boxe et les sports de combat, à distance : puissance de frappe, explosivité, cardio sur les rounds et récupération. Programme individualisé autour de vos entraînements et de vos combats.",
    "service_name": "Préparation physique boxe et sports de combat à distance",
    "service_type": "Préparation physique individualisée pour boxeurs et combattants",
    "eyebrow": "BOXE & SPORTS DE COMBAT · À DISTANCE",
    "h1": "Préparation physique boxe et sports de combat.",
    "h1_span": "Frapper plus fort, tenir plus longtemps.",
    "lede": "Puissance, vitesse de bras, jeu de jambes, cardio sur les rounds, récupération entre les combats : AK PRIME construit votre préparation physique autour de vos séances de club et de votre calendrier de combats, en complément de votre coach.",
    "hero_note": "Boxeurs accompagnés jusqu’au niveau pro au Corona Boxe · Master STAPS · 100 % à distance",
    "hero_media": '<video src="../assets/media/boxe-gainage.mp4" poster="../assets/media/boxe-gainage.webp" autoplay muted loop playsinline preload="metadata" aria-label="Alex Kieffer pendant une séance de préparation physique en salle de boxe"></video>',
    "stats": [("Pro", "boxeurs accompagnés jusqu’au niveau pro"), ("Master 2", "STAPS · entraînement et performance"), ("100 %", "à distance, partout en France"), ("20 min", "bilan découverte offert")],
    "qual_h2": "Le physique qui fait la différence dans le ring.",
    "qual_p": "La préparation sert votre boxe : plus de puissance, plus de cardio, sans vous alourdir ni vous fatiguer avant vos séances techniques.",
    "qualities": [
        ("bolt", "Puissance de frappe", "Transfert de force des jambes aux poings, explosivité des enchaînements."),
        ("pulse", "Cardio sur les rounds", "Capacité à répéter les efforts intenses sur toute la durée du combat."),
        ("loop", "Jeu de jambes", "Appuis, déplacements et changements de rythme rapides et économes."),
        ("shield", "Solidité", "Gainage, cou, épaules : encaisser et rester stable sous la pression."),
        ("timer", "Pic de forme le jour J", "Une montée en puissance planifiée jusqu’au combat, puis un affûtage."),
        ("target", "Récupération", "Charge ajustée selon votre fatigue, vos sparrings et votre sommeil."),
    ],
    "week_h2": "Votre prépa s’organise autour de la salle, pas l’inverse.",
    "week_p": "Les séances AK PRIME complètent vos entraînements de boxe et se placent pour ne pas gêner vos sparrings.",
    "week_key": "Sparring",
    "week": [
        ("Lun", "Boxe", "club", "Technique en salle"),
        ("Mar", "Force", "prep", "Force et puissance, 45 min"),
        ("Mer", "Sparring", "key", "Mise de gants"),
        ("Jeu", "Récup", "rest", "Mobilité, récupération active"),
        ("Ven", "Boxe", "club", "Technique en salle"),
        ("Sam", "Cardio", "prep", "Intervalles sur la durée des rounds"),
        ("Dim", "Repos", "rest", "Repos complet"),
    ],
    "gallery": '''<section class="section section-dark sp-gallery-section" id="en-seance">
  <div class="shell">
    <div class="section-heading"><span class="kicker">EN SÉANCE</span><h2>Sur le terrain, avec des boxeurs.</h2><p>Extraits de séances de préparation physique en salle de boxe.</p></div>
    <div class="sp-gallery">
      <figure><video src="../assets/media/boxe-medecine-ball.mp4" poster="../assets/media/boxe-medecine-ball.webp" autoplay muted loop playsinline preload="none" aria-label="Lancer de médecine-ball contre le mur"></video><figcaption>Puissance : lancers de médecine-ball</figcaption></figure>
      <figure><img src="../assets/media/alex-chrono-boxe.webp" alt="Alex Kieffer chronomètre en main dans une salle de boxe" width="369" height="682" loading="lazy" decoding="async"><figcaption>Chaque série est mesurée</figcaption></figure>
      <figure><video src="../assets/media/boxe-gainage.mp4" poster="../assets/media/boxe-gainage.webp" autoplay muted loop playsinline preload="none" aria-label="Exercice de gainage dynamique"></video><figcaption>Gainage et solidité</figcaption></figure>
    </div>
  </div>
</section>
''',
    "art_tag": "BOXE · COMBAT",
    "art_text": "Votre style. Votre prochain combat. Votre progression.",
    "trust": [
        ("Corona Boxe", "Prépa physique · boxeurs jusqu’au niveau pro"),
        ("Encadrement technique", "Boxe et haltérophilie"),
        ("Master STAPS", "Entraînement et optimisation de la performance"),
    ],
    "who_h2": "Vous combattez et voulez franchir un cap.",
    "who_p": "Boxe anglaise, kick, muay thaï, MMA ou autre sport de combat : votre coach a déjà beaucoup à gérer avec la technique et la préparation des combats. AK PRIME s’occupe de votre physique, en lien avec lui.",
    "tiles": [
        ("OBJECTIF", "Plus de puissance", "Puissance de frappe, explosivité des enchaînements et vitesse de bras, travaillées de façon ciblée."),
        ("OBJECTIF", "Tenir tous les rounds", "Un cardio et une capacité à répéter les efforts intenses construits pour la durée réelle de vos combats."),
        ("OBJECTIF", "Arriver frais au combat", "Une charge d’entraînement planifiée jusqu’au jour J, avec une récupération pensée entre les échéances."),
    ],
    "method_h2": "Une préparation construite pour le combat.<br>Pas un programme de musculation classique.",
    "method_p": "Chaque cycle tient compte de votre discipline, de vos séances de club et de la date de vos prochains combats. Le physique est préparé pour servir votre boxe, pas pour la gêner.",
    "process": [
        ("Comprendre", "Discipline, niveau, catégorie, volume d’entraînement, date des prochains combats et objectifs."),
        ("Évaluer", "Tests réalisables à distance selon votre matériel : force, explosivité, capacité à répéter les efforts."),
        ("Planifier", "Cycles organisés autour de vos séances de club et de votre calendrier, avec une montée en puissance vers le combat."),
        ("Suivre", "Retours après chaque séance et suivi de la fatigue pour éviter le surentraînement avant l’échéance."),
        ("Adapter", "Ajustements selon vos sensations, vos retests et votre calendrier, avec analyse vidéo selon la formule."),
    ],
    "coach": "Diplômé d’un Master STAPS en entraînement et optimisation de la performance sportive, Alex Kieffer a assuré la préparation physique de boxeurs jusqu’au niveau pro au Corona Boxe, et l’encadrement technique en boxe et en haltérophilie. Il a aussi préparé physiquement l’équipe pro féminine de football de Thonon Évian Grand Genève (Seconde Ligue) et travaillé en handball au niveau national.",
    "faq_h2": "Préparation physique en sports de combat : vos questions.",
    "faq": [
        ("Mon coach s’occupe déjà de ma préparation, à quoi servez-vous ?", "AK PRIME vient en complément de votre coach, pas à sa place. En boxe, le coach a déjà énormément à gérer avec la technique et les combats : la préparation physique individualisée travaille vos besoins à vous, comme la puissance, le jeu de jambes ou la récupération, en lien avec lui."),
        ("C’est adapté à la boxe anglaise uniquement ?", "Non. La méthode s’adapte aux sports de pieds-poings et de combat : boxe anglaise, kick-boxing, muay thaï, MMA… Les exigences de votre discipline et la durée de vos rounds sont prises en compte dans la programmation."),
        ("Est-ce que je vais perdre en vitesse si je fais de la musculation ?", "Pas si c’est bien construit. La préparation vise la force utile au combat : puissance, explosivité et solidité, sans alourdir vos déplacements ni vous fatiguer avant vos séances de boxe."),
        ("Et la gestion du poids avant une pesée ?", "La préparation physique tient compte de votre catégorie et de votre calendrier. Les formules Premium incluent un budget calorique et des macros, sans menus ; AK PRIME ne propose pas de prise en charge diététique ou médicale."),
        ("Comment ça se passe à distance ?", "Vos séances sont sur l’application Optitrainer, vous faites vos retours après chaque séance, et nous faisons le point en visio selon votre formule. Vous pouvez envoyer des vidéos pour une analyse des mouvements."),
        ("Combien ça coûte ?", "Les formules Performance démarrent à 99 € par mois, avec un engagement minimum de 3 mois pour laisser le temps à la progression. Le bilan découverte de 20 minutes est offert et sans engagement."),
    ],
    "final_h2": "Parlons de votre prochain combat.",
    "final_p": "20 minutes en visio pour faire le point sur votre niveau, vos objectifs et la formule la plus adaptée. Gratuit et sans engagement.",
    "other_links": '<a href="../handball/">Handball <span aria-hidden="true">↗</span></a><a href="../preparation-physique/">Préparation physique <span aria-hidden="true">↗</span></a>',
}

if __name__ == "__main__":
    build(HANDBALL)
    build(COMBAT)
