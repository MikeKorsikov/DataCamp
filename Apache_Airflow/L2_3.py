# Scheduling

from datetime import datetime, timedelta
from airflow import DAG

# Update the scheduling arguments as defined
default_args = {
    'owner': 'Engineering',
    'start_date': datetime(2023, 11, 1),  # Fixed start date
    'email': ['airflowresults@datacamp.com'],
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=20)  # 20-minute retry delay
}

# Define the DAG with cron schedule (every Wednesday at 12:30 PM)
dag = DAG(
    'update_dataflows',
    default_args=default_args,
    schedule_interval='30 12 * * 3'  # Cron: 12:30 PM every Wednesday
)