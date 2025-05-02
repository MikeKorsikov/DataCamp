# Executors 
# mechanism that actually runs your tasks

from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def print_hello():
    print("Hello World")

default_args = {
    'owner': 'airflow',
    'start_date': datetime(2023, 1, 1),
}

with DAG(
    'sequential_executor_example',
    default_args=default_args,
    schedule_interval=None
) as dag:
    
    task1 = PythonOperator(
        task_id='print_hello1',
        python_callable=print_hello
    )
    
    task2 = PythonOperator(
        task_id='print_hello2',
        python_callable=print_hello
    )
    
    task1 >> task2