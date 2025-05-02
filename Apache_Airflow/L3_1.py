# sensors - operaor that waits for a certain condition to be met

# filesensor 
from datetime import datetime
from airflow import DAG
from airflow.operators.dummy import DummyOperator
from airflow.sensors.filesystem import FileSensor

default_args = {
    'owner': 'airflow',
    'start_date': datetime(2023, 1, 1),
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'file_sensor_example',
    default_args=default_args,
    schedule_interval='@daily',
    catchup=False
) as dag:
    
    start_task = DummyOperator(task_id='start')
    
    # This sensor waits for a file to appear at the specified path
    wait_for_file = FileSensor(
        task_id='wait_for_file',
        filepath='/path/to/your/file.txt',  # File to wait for
        poke_interval=30,  # Check every 30 seconds
        timeout=60*60,  # Timeout after 1 hour
        mode='poke'  # Default mode (alternatively 'reschedule')
    )
    
    process_file = DummyOperator(task_id='process_file')
    
    end_task = DummyOperator(task_id='end')
    
    start_task >> wait_for_file >> process_file >> end_task