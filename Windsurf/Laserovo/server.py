"""
Laserovo - Laser Hair Removal Clinic Management System

A Flask-based web application for managing clients and appointments
in a laser hair removal clinic. Features include client management,
appointment scheduling with procedure tracking per body area,
and basic data persistence using CSV files.

Author: Laserovo Development Team
Version: 1.0.0
"""

from flask import Flask, request, jsonify, make_response, send_from_directory
import csv
import os
from datetime import datetime
import uuid
from typing import Optional, Dict, List, Any

# Initialize Flask application
app = Flask(__name__, static_folder='.', static_url_path='')

# Configuration constants
CSV_FILENAME = os.path.join(os.path.dirname(__file__), 'clients.csv')
CSV_FIELDS = [
    'id', 'name', 'surname', 'phone', 'email', 'facebook', 'instagram', 'booksy', 'dob', 'created_at'
]

APPOINTMENTS_CSV_FILENAME = os.path.join(os.path.dirname(__file__), 'appointments.csv')
APPOINTMENTS_CSV_FIELDS = [
    'visit_id', 'client_id', 'procedure_number', 'appointment_datetime', 'area', 'power', 'confirmed', 'amount_pln', 'created_at'
]

# HTTP status codes for better readability
HTTP_OK = 200
HTTP_CREATED = 201
HTTP_BAD_REQUEST = 400
HTTP_NOT_FOUND = 404
HTTP_INTERNAL_SERVER_ERROR = 500
HTTP_NO_CONTENT = 204


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# =============================================================================
# API ROUTES
# =============================================================================

def ensure_csv_header(filename: str, fieldnames: List[str]) -> None:
    """
    Ensure CSV file exists with proper headers.
    
    Args:
        filename (str): Path to the CSV file
        fieldnames (List[str]): List of column names for the CSV
    """
    if not os.path.exists(filename):
        with open(filename, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()


def ensure_clients_csv_header() -> None:
    """Ensure clients CSV file exists with proper headers."""
    ensure_csv_header(CSV_FILENAME, CSV_FIELDS)


def ensure_appointments_csv_header() -> None:
    """Ensure appointments CSV file exists with proper headers."""
    ensure_csv_header(APPOINTMENTS_CSV_FILENAME, APPOINTMENTS_CSV_FIELDS)


def get_client_id_by_name(name: str, surname: str) -> Optional[str]:
    """
    Find client ID by name and surname (case-insensitive).
    
    Args:
        name (str): Client's first name
        surname (str): Client's last name
        
    Returns:
        Optional[str]: Client ID if found, None otherwise
    """
    if not os.path.exists(CSV_FILENAME):
        return None
    
    with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (row['name'].strip().lower() == name.strip().lower() and 
                row['surname'].strip().lower() == surname.strip().lower()):
                return row['id']
    return None


def get_next_procedure_number(client_id: str, area: str) -> int:
    """
    Get the next procedure number for a client for a specific body area/zone.
    
    This function tracks procedure numbers per body area, so if a client has
    2 procedures for 'face' and makes a new appointment for 'bikini',
    the bikini procedure will be numbered as #1.
    
    Args:
        client_id (str): Unique identifier for the client
        area (str): Body area for the procedure (e.g., 'face', 'bikini', 'back')
        
    Returns:
        int: Next procedure number for this client and area combination
    """
    if not os.path.exists(APPOINTMENTS_CSV_FILENAME):
        return 1
    
    max_procedure = 0
    with open(APPOINTMENTS_CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (row['client_id'] == client_id and 
                row['area'].strip().lower() == area.strip().lower()):
                try:
                    procedure_num = int(row['procedure_number'])
                    max_procedure = max(max_procedure, procedure_num)
                except ValueError:
                    # Skip rows with invalid procedure numbers
                    continue
    
    return max_procedure + 1


def add_cors_headers(response: Any) -> Any:
    """
    Add CORS headers to response for cross-origin requests.
    
    Args:
        response: Flask response object
        
    Returns:
        Response object with CORS headers added
    """
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


def create_error_response(message: str, status_code: int) -> Any:
    """
    Create a standardized error response.
    
    Args:
        message (str): Error message
        status_code (int): HTTP status code
        
    Returns:
        JSON response with error details
    """
    resp = jsonify({'status': 'error', 'message': message})
    resp.status_code = status_code
    return add_cors_headers(resp)


def create_success_response(data: Dict[str, Any], status_code: int = HTTP_OK) -> Any:
    """
    Create a standardized success response.
    
    Args:
        data (Dict[str, Any]): Response data
        status_code (int): HTTP status code
        
    Returns:
        JSON response with success data
    """
    resp = jsonify({'status': 'ok', **data})
    resp.status_code = status_code
    return add_cors_headers(resp)


@app.route('/clients', methods=['POST', 'OPTIONS'])
def create_client():
    """
    Create a new client record.
    
    Expected JSON payload:
    {
        'name': str (required),
        'surname': str (required),
        'phone': str (optional),
        'email': str (optional),
        'facebook': str (optional),
        'instagram': str (optional),
        'booksy': str (optional),
        'dob': str (optional) - date of birth in YYYY-MM-DD format
    }
    
    Returns:
        JSON response with client ID on success, error message on failure
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))

    try:
        payload = request.get_json(silent=True) or {}
        
        # Validate required fields
        name = (payload.get('name') or '').strip()
        surname = (payload.get('surname') or '').strip()
        
        if not name or not surname:
            return create_error_response('Name and surname are required', HTTP_BAD_REQUEST)
        
        # Check if client already exists
        existing_client_id = get_client_id_by_name(name, surname)
        if existing_client_id:
            return create_error_response(f'Client {name} {surname} already exists', HTTP_BAD_REQUEST)
        
        # Create new client record
        client_id = uuid.uuid4().hex
        now_iso = datetime.utcnow().isoformat()

        record = {
            'id': client_id,
            'name': name,
            'surname': surname,
            'phone': (payload.get('phone') or '').strip(),
            'email': (payload.get('email') or '').strip(),
            'facebook': (payload.get('facebook') or '').strip(),
            'instagram': (payload.get('instagram') or '').strip(),
            'booksy': (payload.get('booksy') or '').strip(),
            'dob': (payload.get('dob') or '').strip(),
            'created_at': now_iso,
        }

        # Save to CSV
        ensure_clients_csv_header()
        with open(CSV_FILENAME, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            writer.writerow(record)

        return create_success_response({'id': client_id, 'message': f'Client {name} {surname} created successfully'}, HTTP_CREATED)
        
    except Exception as exc:
        return create_error_response(f'Failed to create client: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/clients/search', methods=['GET', 'OPTIONS'])
def search_clients():
    """
    Search for clients by field and search term.
    
    Query parameters:
        field (str): Field to search in (name, surname, phone, email, etc.)
        term (str): Search term
    
    Returns:
        JSON response with matching clients
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))
    
    try:
        field = request.args.get('field', '').strip()
        term = request.args.get('term', '').strip()
        
        if not field or not term:
            return create_error_response('Field and term parameters are required', HTTP_BAD_REQUEST)
        
        if field not in CSV_FIELDS:
            return create_error_response(f'Invalid field. Must be one of: {', '.join(CSV_FIELDS)}', HTTP_BAD_REQUEST)
        
        results = []
        if os.path.exists(CSV_FILENAME):
            with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if field in row and term.lower() in row[field].lower():
                        results.append(row)
        
        return create_success_response({'results': results, 'count': len(results)})
        
    except Exception as exc:
        return create_error_response(f'Search failed: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/clients/<client_id>', methods=['GET', 'OPTIONS'])
def get_client(client_id: str):
    """
    Get a specific client by ID.
    
    Args:
        client_id (str): Unique identifier for the client
        
    Returns:
        JSON response with client data or error message
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))
    
    try:
        if not os.path.exists(CSV_FILENAME):
            return create_error_response('No clients found', HTTP_NOT_FOUND)
        
        with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['id'] == client_id:
                    return create_success_response({'client': row})
        
        return create_error_response('Client not found', HTTP_NOT_FOUND)
        
    except Exception as exc:
        return create_error_response(f'Failed to retrieve client: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/clients/<client_id>', methods=['PUT', 'OPTIONS'])
def update_client(client_id: str):
    """
    Update an existing client's information.
    
    Args:
        client_id (str): Unique identifier for the client
        
    Expected JSON payload (all fields optional):
    {
        'name': str,
        'surname': str,
        'phone': str,
        'email': str,
        'facebook': str,
        'instagram': str,
        'booksy': str,
        'dob': str
    }
    
    Returns:
        JSON response with success/error message
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))
    
    try:
        payload = request.get_json(silent=True) or {}
        
        if not os.path.exists(CSV_FILENAME):
            return create_error_response('No clients found', HTTP_NOT_FOUND)
        
        # Read all clients and find the one to update
        clients = []
        client_found = False
        
        with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['id'] == client_id:
                    # Update only provided fields
                    for field in ['name', 'surname', 'phone', 'email', 'facebook', 'instagram', 'booksy', 'dob']:
                        if field in payload:
                            row[field] = (payload.get(field) or '').strip()
                    client_found = True
                clients.append(row)
        
        if not client_found:
            return create_error_response('Client not found', HTTP_NOT_FOUND)
        
        # Write back all clients
        with open(CSV_FILENAME, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            writer.writeheader()
            writer.writerows(clients)
        
        return create_success_response({'message': 'Client updated successfully'})
        
    except Exception as exc:
        return create_error_response(f'Failed to update client: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/clients', methods=['GET', 'OPTIONS'])
def get_all_clients():
    """
    Get all clients.
    
    Returns:
        JSON response with list of all clients
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))
    
    try:
        results = []
        if os.path.exists(CSV_FILENAME):
            with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    results.append(row)
        
        return create_success_response({'results': results, 'count': len(results)})
        
    except Exception as exc:
        return create_error_response(f'Failed to retrieve clients: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/appointments', methods=['POST', 'OPTIONS'])
def create_appointment():
    """
    Create a new appointment for an existing client.
    
    Expected JSON payload:
    {
        'name': str (required) - Client's first name,
        'surname': str (required) - Client's last name,
        'appointment_datetime': str (required) - ISO format datetime,
        'area': str (required) - Body area for procedure
    }
    
    Returns:
        JSON response with appointment details or error message
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))

    try:
        payload = request.get_json(silent=True) or {}
        
        # Validate required fields
        name = (payload.get('name') or '').strip()
        surname = (payload.get('surname') or '').strip()
        appointment_datetime = (payload.get('appointment_datetime') or '').strip()
        area = (payload.get('area') or '').strip()
        
        if not all([name, surname, appointment_datetime, area]):
            return create_error_response('Name, surname, appointment datetime, and area are required', HTTP_BAD_REQUEST)
        
        # Find client ID
        client_id = get_client_id_by_name(name, surname)
        if not client_id:
            return create_error_response('Client not found. Please add the client first.', HTTP_NOT_FOUND)
        
        # Generate visit ID and get next procedure number for this area
        visit_id = uuid.uuid4().hex
        procedure_number = get_next_procedure_number(client_id, area)
        now_iso = datetime.utcnow().isoformat()
        
        # Create appointment record
        record = {
            'visit_id': visit_id,
            'client_id': client_id,
            'procedure_number': procedure_number,
            'appointment_datetime': appointment_datetime,
            'area': area,
            'power': '',  # To be populated after visit
            'confirmed': 'no',  # Default to not confirmed
            'amount_pln': '',  # To be populated after visit
            'created_at': now_iso,
        }
        
        # Save to CSV
        ensure_appointments_csv_header()
        with open(APPOINTMENTS_CSV_FILENAME, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=APPOINTMENTS_CSV_FIELDS)
            writer.writerow(record)
        
        return create_success_response({
            'visit_id': visit_id,
            'procedure_number': procedure_number,
            'message': f'Appointment created successfully. Procedure #{procedure_number} for {area} - {name} {surname}'
        }, HTTP_CREATED)
        
    except Exception as exc:
        return create_error_response(f'Failed to create appointment: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/appointments', methods=['GET', 'OPTIONS'])
def get_all_appointments():
    """
    Get all appointments.
    
    Returns:
        JSON response with list of all appointments
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))
    
    try:
        results = []
        if os.path.exists(APPOINTMENTS_CSV_FILENAME):
            with open(APPOINTMENTS_CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    results.append(row)
        
        return create_success_response({'results': results, 'count': len(results)})
        
    except Exception as exc:
        return create_error_response(f'Failed to retrieve appointments: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/')
def serve_index():
    """
    Serve the main index page.
    
    Returns:
        HTML content of the index page
    """
    return send_from_directory(app.static_folder, 'index.html')


# =============================================================================
# APPLICATION ENTRY POINT
# =============================================================================

if __name__ == '__main__':
    """
    Run the Flask development server.
    
    This starts the application in debug mode for development.
    In production, use a WSGI server like Gunicorn.
    """
    print("Starting Laserovo Laser Hair Removal Management System...")
    print("Server will be available at: http://127.0.0.1:5000")
    print("Press Ctrl+C to stop the server")
    
    app.run(host='127.0.0.1', port=5000, debug=True)


