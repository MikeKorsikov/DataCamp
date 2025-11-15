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
import shutil

# =============================================================================
# APPLICATION INITIALIZATION
# =============================================================================

# Initialize Flask application with static file serving from current directory
app = Flask(__name__, static_folder='.', static_url_path='')

# =============================================================================
# CONFIGURATION CONSTANTS
# =============================================================================

# Client data file configuration
CSV_FILENAME = os.path.join(os.path.dirname(__file__), 'clients.csv')
CSV_FIELDS = [
    'id', 'name', 'surname', 'phone', 'email', 'facebook', 'instagram', 'booksy', 'dob', 'created_at'
]

# Appointment data file configuration
APPOINTMENTS_CSV_FILENAME = os.path.join(os.path.dirname(__file__), 'appointments.csv')
APPOINTMENTS_CSV_FIELDS = [
    'visit_id', 'client_id', 'procedure_number', 'appointment_datetime', 'area', 'power', 'confirmed', 'amount_pln', 'created_at'
]

# Expense data file configuration
EXPENSES_CSV_FILENAME = os.path.join(os.path.dirname(__file__), 'expenses.csv')
EXPENSES_CSV_FIELDS = [
    'expense_id', 'expense_date', 'expense_amount', 'quantity', 'expense_category', 
    'tax_deductible', 'payment_method', 'expense_notes'
]

# Backup directory configuration
BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'Backup')
os.makedirs(BACKUP_DIR, exist_ok=True)  # Create backup directory if it doesn't exist

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


def ensure_expenses_csv_header() -> None:
    """Ensure expenses CSV file exists with proper headers."""
    ensure_csv_header(EXPENSES_CSV_FILENAME, EXPENSES_CSV_FIELDS)


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


def backup_csv_files() -> Dict[str, Any]:
    """
    Create timestamped backup copies of all CSV files.
    
    Creates backup files in the BACKUP_DIR with timestamp format: YYYYMMDD_HHMMSS.
    Backs up clients.csv, appointments.csv, and expenses.csv if they exist.
    
    Returns:
        Dict[str, Any]: Dictionary containing:
            - success (bool): Whether backup was successful
            - message (str): Success or error message
            - backups (dict): Paths to created backup files
    """
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backups = {}
        
        # Ensure backup directory exists
        os.makedirs(BACKUP_DIR, exist_ok=True)
        
        # Backup clients.csv
        if os.path.exists(CSV_FILENAME):
            backup_filename = f'clients_backup_{timestamp}.csv'
            backup_path = os.path.join(BACKUP_DIR, backup_filename)
            shutil.copy2(CSV_FILENAME, backup_path)
            backups['clients'] = backup_path
        
        # Backup appointments.csv
        if os.path.exists(APPOINTMENTS_CSV_FILENAME):
            backup_filename = f'appointments_backup_{timestamp}.csv'
            backup_path = os.path.join(BACKUP_DIR, backup_filename)
            shutil.copy2(APPOINTMENTS_CSV_FILENAME, backup_path)
            backups['appointments'] = backup_path
            
        # Backup expenses.csv
        if os.path.exists(EXPENSES_CSV_FILENAME):
            backup_filename = f'expenses_backup_{timestamp}.csv'
            backup_path = os.path.join(BACKUP_DIR, backup_filename)
            shutil.copy2(EXPENSES_CSV_FILENAME, backup_path)
            backups['expenses'] = backup_path
        
        return {
            'success': True,
            'message': 'Backup created successfully',
            'backups': backups
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Backup failed: {str(e)}',
            'backups': {}
        }

@app.route('/api/backup', methods=['POST'])
def create_backup():
    """
    API endpoint to create a backup of all CSV files.
    
    Creates timestamped backups of clients.csv and appointments.csv in the Backup directory.
    
    Returns:
        JSON response with backup details or error message
    """
    try:
        result = backup_csv_files()
        if result['success']:
            return create_success_response(result, HTTP_CREATED)
        return create_error_response(result['message'], HTTP_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return create_error_response(f'Backup failed: {str(e)}', HTTP_INTERNAL_SERVER_ERROR)


# =============================================================================
# API ROUTES
# =============================================================================

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
            return create_error_response(f"Invalid field. Must be one of: {', '.join(CSV_FIELDS)}", HTTP_BAD_REQUEST)
        
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


@app.route('/clients/<client_id>/stats', methods=['GET', 'OPTIONS'])
def get_client_stats(client_id: str):
    """
    Get visit statistics for a specific client.
    
    Args:
        client_id (str): Unique identifier for the client
        
    Returns:
        JSON response with visit counts per area
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))
    
    try:
        if not os.path.exists(APPOINTMENTS_CSV_FILENAME):
            return create_success_response({'stats': {}})

        stats = {}
        last_visits: Dict[str, datetime] = {}
        last_procedures: Dict[str, int] = {}
        now = datetime.now()
        with open(APPOINTMENTS_CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['client_id'] == client_id and row['confirmed'].strip().lower() == 'yes':
                    area = row['area'].strip().lower()
                    if not area:
                        continue
                    # Parse appointment datetime
                    dt_raw = (row.get('appointment_datetime') or '').strip()
                    try:
                        dt = datetime.fromisoformat(dt_raw)
                    except Exception:
                        continue
                    # Only consider visits not in the future
                    if dt <= now:
                        # Count confirmed visits per area (up to today)
                        stats[area] = stats.get(area, 0) + 1
                        # Track latest confirmed visit not in the future
                        if area not in last_visits or dt > last_visits[area]:
                            last_visits[area] = dt
                            # Update last procedure number for this latest visit
                            try:
                                last_procedures[area] = int(row.get('procedure_number') or 0)
                            except ValueError:
                                last_procedures[area] = 0
        
        # Convert datetimes to ISO strings for JSON response
        last_visits_serialized: Dict[str, str] = {k: v.isoformat() for k, v in last_visits.items()}
        return create_success_response({'stats': stats, 'last_visits': last_visits_serialized, 'last_procedures': last_procedures})

    except Exception as exc:
        return create_error_response(f'Failed to retrieve client stats: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


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


def has_existing_appointment(appointment_datetime: str) -> bool:
    """
    Check if there's an existing appointment at the same date and time.
    
    Args:
        appointment_datetime (str): ISO format datetime to check
        
    Returns:
        bool: True if an appointment exists at the same time, False otherwise
    """
    if not os.path.exists(APPOINTMENTS_CSV_FILENAME):
        return False
    
    try:
        target_time = datetime.fromisoformat(appointment_datetime).replace(second=0, microsecond=0)
        
        with open(APPOINTMENTS_CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    row_time = datetime.fromisoformat(row['appointment_datetime']).replace(second=0, microsecond=0)
                    if row_time == target_time:
                        return True
                except (ValueError, KeyError):
                    continue
        return False
    except Exception:
        return False

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
        
        # Check for existing appointment at the same time
        if has_existing_appointment(appointment_datetime):
            return create_error_response('Time slot is not available! Please choose a different time.', HTTP_BAD_REQUEST)
        
        # Find client ID
        client_id = get_client_id_by_name(name, surname)
        if not client_id:
            return create_error_response('Client not found. Please add the client first.', HTTP_NOT_FOUND)
        
        # Generate visit ID and get next procedure number for this area
        visit_id = uuid.uuid4().hex
        procedure_number = get_next_procedure_number(client_id, area)
        now_iso = datetime.utcnow().isoformat()
        
        # Optional fields
        confirmed_val = (payload.get('confirmed') or 'no').strip().lower()
        confirmed_val = 'yes' if confirmed_val == 'yes' else 'no'
        power_val = (payload.get('power') or '').strip()
        amount_val = (payload.get('amount_pln') or '').strip()

        # Create appointment record
        record = {
            'visit_id': visit_id,
            'client_id': client_id,
            'procedure_number': procedure_number,
            'appointment_datetime': appointment_datetime,
            'area': area,
            'power': power_val,  # Optional, can be filled later
            'confirmed': confirmed_val,  # Use provided value or default to 'no'
            'amount_pln': amount_val,  # Optional, can be filled later
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
    Get all appointments with client information.
    
    Returns:
        JSON response with list of all appointments including client names and areas
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))
    
    try:
        # Load all clients first
        clients = {}
        if os.path.exists(CSV_FILENAME):
            with open(CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                clients = {row['id']: row for row in reader}
        
        # Load appointments and enrich with client data
        results = []
        if os.path.exists(APPOINTMENTS_CSV_FILENAME):
            with open(APPOINTMENTS_CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    client_id = row.get('client_id')
                    if client_id in clients:
                        row['client_name'] = f"{clients[client_id].get('name', '')} {clients[client_id].get('surname', '')}".strip()
                    else:
                        row['client_name'] = 'Unknown Client'
                    results.append(row)
        
        return create_success_response({'results': results, 'count': len(results)})
        
    except Exception as exc:
        return create_error_response(f'Failed to retrieve appointments: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/appointments/<visit_id>', methods=['PUT', 'OPTIONS'])
def update_appointment(visit_id: str):
    """
    Update an existing appointment's information.
    
    Args:
        visit_id (str): Unique identifier for the appointment
        
    Expected JSON payload (all fields optional):
    {
        'appointment_datetime': str,
        'area': str,
        'power': str,
        'confirmed': str,
        'amount_pln': str
    }
    
    Returns:
        JSON response with success/error message
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))
    
    try:
        if not os.path.exists(APPOINTMENTS_CSV_FILENAME):
            return create_error_response('No appointments found', HTTP_NOT_FOUND)
        
        payload = request.get_json()
        if not payload:
            return create_error_response('No data provided', HTTP_BAD_REQUEST)
        
        # Read all appointments
        appointments = []
        appointment_found = False
        original_appointment = None
        
        with open(APPOINTMENTS_CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['visit_id'] == visit_id:
                    original_appointment = row.copy()
                    appointment_found = True
                appointments.append(row)
        
        if not appointment_found:
            return create_error_response('Appointment not found', HTTP_NOT_FOUND)
        
        # Check if area is being changed
        new_area = payload.get('area', '').strip()
        area_changed = new_area and new_area != original_appointment['area']
        
        # Update appointments with new data
        for appointment in appointments:
            if appointment['visit_id'] == visit_id:
                # Update fields except procedure_number (will be recalculated if area changed)
                for key, value in payload.items():
                    if key in APPOINTMENTS_CSV_FIELDS and key not in ['visit_id', 'procedure_number']:
                        appointment[key] = str(value).strip()
                
                # Recalculate procedure number if area changed
                if area_changed:
                    client_id = appointment['client_id']
                    # Count existing procedures for the new area (excluding current appointment)
                    procedure_count = 0
                    for other_apt in appointments:
                        if (other_apt['client_id'] == client_id and 
                            other_apt['area'].strip().lower() == new_area.strip().lower() and
                            other_apt['visit_id'] != visit_id):
                            try:
                                procedure_count = max(procedure_count, int(other_apt['procedure_number']))
                            except ValueError:
                                continue
                    
                    # Set new procedure number
                    appointment['procedure_number'] = str(procedure_count + 1)
                
                break
        
        # Write back all appointments
        with open(APPOINTMENTS_CSV_FILENAME, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=APPOINTMENTS_CSV_FIELDS)
            writer.writeheader()
            writer.writerows(appointments)
        
        success_message = 'Appointment updated successfully'
        if area_changed:
            updated_appointment = next(apt for apt in appointments if apt['visit_id'] == visit_id)
            success_message += f'. Procedure number recalculated to #{updated_appointment["procedure_number"]} for {new_area}'
        
        return create_success_response({'message': success_message})
        
    except Exception as exc:
        return create_error_response(f'Failed to update appointment: {str(exc)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/expenses', methods=['POST', 'OPTIONS'])
def create_expense():
    """
    Create a new expense record.
    
    Expected JSON payload:
    {
        'expense_date': str (required) - date in YYYY-MM-DD format,
        'expense_amount': float (required) - amount in PLN,
        'quantity': int (optional, default=1) - number of items,
        'expense_category': str (required) - category of expense,
        'tax_deductible': str (optional, default='yes') - 'yes' or 'no',
        'payment_method': str (required) - payment method,
        'expense_notes': str (optional) - additional notes
    }
    
    Returns:
        JSON response with expense details or error message
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))

    try:
        payload = request.get_json(silent=True) or {}
        
        # Validate required fields
        expense_date = str(payload.get('expense_date', '')).strip()
        expense_category = str(payload.get('expense_category', '')).strip()
        payment_method = str(payload.get('payment_method', '')).strip()
        
        # Get and validate amount
        try:
            amount = float(payload.get('expense_amount', 0))
            if amount <= 0:
                return create_error_response('Amount must be a positive number', HTTP_BAD_REQUEST)
        except (ValueError, TypeError):
            return create_error_response('Invalid amount. Must be a number', HTTP_BAD_REQUEST)
        
        # Check for empty required fields
        if not all([expense_date, expense_category, payment_method]):
            return create_error_response('Expense date, category, and payment method are required', HTTP_BAD_REQUEST)
        
        # Validate date format
        try:
            datetime.strptime(expense_date, '%Y-%m-%d')
        except ValueError:
            return create_error_response('Invalid date format. Use YYYY-MM-DD', HTTP_BAD_REQUEST)
        
        # Set default values for optional fields
        quantity = int(payload.get('quantity', 1))
        tax_deductible = 'yes' if str(payload.get('tax_deductible', 'yes')).lower() == 'yes' else 'no'
        expense_notes = (payload.get('expense_notes') or '').strip()
        
        # Generate expense ID and timestamp
        expense_id = uuid.uuid4().hex
        
        # Create expense record
        record = {
            'expense_id': expense_id,
            'expense_date': expense_date,
            'expense_amount': f"{amount:.2f}",
            'quantity': quantity,
            'expense_category': expense_category,
            'tax_deductible': tax_deductible,
            'payment_method': payment_method,
            'expense_notes': expense_notes
        }
        
        # Save to CSV
        ensure_expenses_csv_header()
        with open(EXPENSES_CSV_FILENAME, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=EXPENSES_CSV_FIELDS)
            writer.writerow(record)
        
        return create_success_response({
            'expense_id': expense_id,
            'message': f'Expense of {amount:.2f} PLN for {expense_category} saved successfully.'
        }, HTTP_CREATED)
        
    except Exception as e:
        return create_error_response(f'Failed to save expense: {str(e)}', HTTP_INTERNAL_SERVER_ERROR)


@app.route('/expenses', methods=['GET', 'OPTIONS'])
def get_all_expenses():
    """
    Get all expenses.
    
    Returns:
        JSON response with list of all expenses
    """
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', HTTP_NO_CONTENT))

    try:
        if not os.path.exists(EXPENSES_CSV_FILENAME):
            return create_success_response({'expenses': []})
        
        expenses = []
        with open(EXPENSES_CSV_FILENAME, mode='r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            expenses = list(reader)
        
        # Convert amount to float for proper sorting
        for expense in expenses:
            if 'expense_amount' in expense and expense['expense_amount']:
                try:
                    expense['expense_amount'] = float(expense['expense_amount'])
                except (ValueError, TypeError):
                    expense['expense_amount'] = 0.0
            
            # Convert quantity to int
            if 'quantity' in expense and expense['quantity']:
                try:
                    expense['quantity'] = int(expense['quantity'])
                except (ValueError, TypeError):
                    expense['quantity'] = 1
        
        # Sort by date (newest first)
        expenses.sort(key=lambda x: x.get('expense_date', ''), reverse=True)
        
        return create_success_response({'expenses': expenses})
        
    except Exception as e:
        return create_error_response(f'Failed to retrieve expenses: {str(e)}', HTTP_INTERNAL_SERVER_ERROR)


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
    print("Server will be available at: http://127.0.0.1:5001")
    print("Press Ctrl+C to stop the server")
    
    app.run(host='127.0.0.1', port=5001, debug=True)
