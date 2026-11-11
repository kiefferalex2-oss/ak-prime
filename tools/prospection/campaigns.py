"""Preparation only. No network publication or private messaging without approval."""
import datetime as dt
import json
from zoneinfo import ZoneInfo

POLES = ('performance', 'forme_sante', 'mental')
BRIEF = '''AK PRIME, Alex Kieffer, accompagnement à distance.
Trois pôles : préparation physique/performance sportive, forme et santé,
préparation mentale. Bilan découverte offert en visio, 20 minutes :
https://akprime.fr/bilan-offert/. Identité bleu nuit et or, ton direct, humain,
professionnel. Pas de posture d'influenceur ni de faux témoignages. Mettre en
avant le suivi individuel, les ajustements, les échanges et les outils de suivi.
Ne pas inventer de résultats, de clients, de certifications, de garanties, de
réductions ou de tarifs. Ne pas revendiquer de soins, de diagnostic ni une
présence physique sur le terrain. Les tarifs et formules collectives nécessitent
une vérification préalable. Ne jamais lancer de dépense ou de publicité payante.
Pour les professionnels, chercher une adéquation concrète à leur activité.
Les destinataires possibles sont clubs, associations sportives et professionnels
du sport ou du bien-être, ainsi que particuliers adultes avec accord préalable
pour les contacts commerciaux. Ne pas déduire de pathologies ou de données de santé.
Chaque contenu doit être relu et validé par le propriétaire avant utilisation.
'''


def valid_draft(draft):
    if not isinstance(draft, dict):
        return False
    fields = ('kind', 'channel', 'pole', 'title', 'body', 'visual_title', 'visual_points', 'rationale')
    if any(not isinstance(draft.get(k), str) for k in fields):
        return False
    if draft['kind'] not in ('publication', 'suggestion') or draft['pole'] not in POLES:
        return False
    if draft['kind'] == 'publication' and draft['channel'] not in ('facebook', 'instagram'):
        return False
    if draft['kind'] == 'suggestion' and draft['channel'] != 'strategy':
        return False
    if not 4 <= len(draft['title']) <= 120 or not 40 <= len(draft['body']) <= 2100:
        return False
    if len(draft['visual_title']) > 90 or len(draft['visual_points']) > 280 or len(draft['rationale']) > 1000:
        return False
    if draft['kind'] == 'publication':
        def fits(text, width, maximum):
            count, current = 1, ''
            for word in text.split():
                if len(word) > width + 5:
                    return False
                if len((current + ' ' + word).strip()) > width and current:
                    count, current = count + 1, word
                else:
                    current = (current + ' ' + word).strip()
            return count <= maximum
        if not fits(draft['visual_title'] or draft['title'], 27, 3):
            return False
        points = [x for x in draft['visual_points'].splitlines() if x.strip()]
        if len(points) > 3 or any(not fits(x, 43, 2) for x in points):
            return False
    return True


def prepare_campaigns(db, ask_model, output_text, at):
    day = at.astimezone(ZoneInfo('Europe/Paris')).date()
    pole = POLES[day.toordinal() % len(POLES)]
    if not db.rpc('prospection_reserve_creative', {'p_day': day.isoformat()}):
        return 0
    keys = ('kind', 'channel', 'pole', 'title', 'body', 'visual_title', 'visual_points', 'rationale')
    response = ask_model({
        'instructions': BRIEF + '\nPrépare un post Facebook, une variante Instagram, et une suggestion de développement. '
        'kind publication ou suggestion ; channel facebook, instagram ou strategy ; '
        'pole performance, forme_sante ou mental. Les titres de visuel sont courts (65 caractères maximum), '
        'visual_points contient 3 lignes courtes séparées par un retour à la ligne (65 caractères par ligne maximum). '
        'Pour une suggestion, explique une action testable, le bénéfice attendu sans le présenter comme certain, '
        'et les moyens nécessaires. Privilégie les tests sans dépense. Les champs visuels peuvent être vides pour une suggestion. '
        'Le post précise le distanciel et propose le bilan offert ; la suggestion ne vaut pas autorisation d’exécution.',
        'input': f'Date : {day.isoformat()}. Pôle à travailler : {pole}. Aucun résultat commercial mesuré fourni : ne pas en inventer.',
        'max_output_tokens': 4500,
        'text': {'format': {'type': 'json_schema', 'name': 'promotion', 'strict': True, 'schema': {
            'type': 'object', 'properties': {'drafts': {'type': 'array', 'items': {
                'type': 'object', 'properties': {k: {'type': 'string'} for k in keys},
                'required': list(keys), 'additionalProperties': False}}},
            'required': ['drafts'], 'additionalProperties': False}}},
    })
    inserted = 0
    for index, draft in enumerate(json.loads(output_text(response)).get('drafts', [])[:3]):
        if not valid_draft(draft):
            continue
        draft.update(batch_key=f'{day.isoformat()}-{index}', target_label='AK PRIME', status='draft')
        result = db.call('prospection_drafts?on_conflict=batch_key', 'POST', draft,
                         'resolution=ignore-duplicates,return=representation')
        inserted += len(result or [])
    return inserted
