from flask import Flask, request, jsonify, make_response, send_from_directory
import csv
import os
from datetime import datetime
import uuid

app = Flask(__name__, static_folder='.', static_url_path='')


CSV_FILENAME = os.path.join(os.path.dirname(__file__), 'clients.csv')
CSV_FIELDS = [
    'id', 'name', 'surname', 'phone', 'email', 'facebook', 'instagram', 'booksy', 'dob', 'created_at'
]


def ensure_csv_header() -> None:
    file_exists = os.path.exists(CSV_FILENAME)
    if not file_exists:
        with open(CSV_FILENAME, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            writer.writeheader()


def add_cors_headers(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return resp


@app.route('/clients', methods=['POST', 'OPTIONS'])
def create_client():
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', 204))

    try:
        payload = request.get_json(silent=True) or {}
        client_id = uuid.uuid4().hex
        now_iso = datetime.utcnow().isoformat()

        record = {
            'id': client_id,
            'name': (payload.get('name') or '').strip(),
            'surname': (payload.get('surname') or '').strip(),
            'phone': (payload.get('phone') or '').strip(),
            'email': (payload.get('email') or '').strip(),
            'facebook': (payload.get('facebook') or '').strip(),
            'instagram': (payload.get('instagram') or '').strip(),
            'booksy': (payload.get('booksy') or '').strip(),
            'dob': (payload.get('dob') or '').strip(),
            'created_at': now_iso,
        }

        ensure_csv_header()
        with open(CSV_FILENAME, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            writer.writerow(record)

        resp = jsonify({'status': 'ok', 'id': client_id})
        return add_cors_headers(resp)
    except Exception as exc:
        resp = jsonify({'status': 'error', 'message': str(exc)})
        resp.status_code = 500
        return add_cors_headers(resp)


@app.route('/clients/search', methods=['GET', 'OPTIONS'])
def search_clients():
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', 204))
    
    try:
        field = request.args.get('field', '').strip()
        term = request.args.get('term', '').strip()
        
        if not field or not term:
            resp = jsonify({'status': 'error', 'message': 'Field and term required'})
            resp.status_code = 400
            return add_cors_headers(resp)
        
        results = []
        if os.path.exists(CSV_FILENAME):
            with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if field in row and term.lower() in row[field].lower():
                        results.append(row)
        
        resp = jsonify({'status': 'ok', 'results': results})
        return add_cors_headers(resp)
    except Exception as exc:
        resp = jsonify({'status': 'error', 'message': str(exc)})
        resp.status_code = 500
        return add_cors_headers(resp)


@app.route('/clients/<client_id>', methods=['GET', 'OPTIONS'])
def get_client(client_id):
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', 204))
    
    try:
        if not os.path.exists(CSV_FILENAME):
            resp = jsonify({'status': 'error', 'message': 'No clients found'})
            resp.status_code = 404
            return add_cors_headers(resp)
        
        with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['id'] == client_id:
                    resp = jsonify({'status': 'ok', 'client': row})
                    return add_cors_headers(resp)
        
        resp = jsonify({'status': 'error', 'message': 'Client not found'})
        resp.status_code = 404
        return add_cors_headers(resp)
    except Exception as exc:
        resp = jsonify({'status': 'error', 'message': str(exc)})
        resp.status_code = 500
        return add_cors_headers(resp)


@app.route('/clients/<client_id>', methods=['PUT', 'OPTIONS'])
def update_client(client_id):
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', 204))
    
    try:
        payload = request.get_json(silent=True) or {}
        
        if not os.path.exists(CSV_FILENAME):
            resp = jsonify({'status': 'error', 'message': 'No clients found'})
            resp.status_code = 404
            return add_cors_headers(resp)
        
        # Read all clients
        clients = []
        client_found = False
        with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['id'] == client_id:
                    # Update the client
                    row.update({
                        'name': (payload.get('name') or row.get('name', '')).strip(),
                        'surname': (payload.get('surname') or row.get('surname', '')).strip(),
                        'phone': (payload.get('phone') or row.get('phone', '')).strip(),
                        'email': (payload.get('email') or row.get('email', '')).strip(),
                        'facebook': (payload.get('facebook') or row.get('facebook', '')).strip(),
                        'instagram': (payload.get('instagram') or row.get('instagram', '')).strip(),
                        'booksy': (payload.get('booksy') or row.get('booksy', '')).strip(),
                        'dob': (payload.get('dob') or row.get('dob', '')).strip(),
                    })
                    client_found = True
                clients.append(row)
        
        if not client_found:
            resp = jsonify({'status': 'error', 'message': 'Client not found'})
            resp.status_code = 404
            return add_cors_headers(resp)
        
        # Write back all clients
        with open(CSV_FILENAME, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            writer.writeheader()
            writer.writerows(clients)
        
        resp = jsonify({'status': 'ok', 'message': 'Client updated successfully'})
        return add_cors_headers(resp)
    except Exception as exc:
        resp = jsonify({'status': 'error', 'message': str(exc)})
        resp.status_code = 500
        return add_cors_headers(resp)


@app.route('/clients', methods=['GET', 'OPTIONS'])
def get_all_clients():
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', 204))
    
    try:
        results = []
        if os.path.exists(CSV_FILENAME):
            with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    results.append(row)
        
        resp = jsonify({'status': 'ok', 'results': results})
        return add_cors_headers(resp)
    except Exception as exc:
        resp = jsonify({'status': 'error', 'message': str(exc)})
        resp.status_code = 500
        return add_cors_headers(resp)


@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    # Development server
    app.run(host='127.0.0.1', port=5000, debug=True)


