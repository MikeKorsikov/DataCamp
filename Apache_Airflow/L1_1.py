# Apache Airflow

# Step 1 -  pip install apache-airflow

# step 2 - Define the DAG

from datetime import datetime, timedelta
import requests
import pandas as pd
from airflow import DAG
from airflow.operators.python_operator import PythonOperator

# Default arguments for the DAG
default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': datetime(2023, 1, 1),
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

# Define the DAG
dag = DAG(
    'simple_etl_pipeline',
    default_args=default_args,
    description='A simple ETL pipeline',
    schedule_interval=timedelta(days=1),  # Run daily
)

# Task 1: Extract data from an API
def extract_data():
    url = "https://jsonplaceholder.typicode.com/posts"
    response = requests.get(url)
    data = response.json()
    return data

# Task 2: Transform data (filter posts with userId == 1)
def transform_data(**kwargs):
    ti = kwargs['ti']
    data = ti.xcom_pull(task_ids='extract_data')
    filtered_data = [post for post in data if post['userId'] == 1]
    return filtered_data

# Task 3: Load data into a CSV file
def load_data(**kwargs):
    ti = kwargs['ti']
    filtered_data = ti.xcom_pull(task_ids='transform_data')
    df = pd.DataFrame(filtered_data)
    df.to_csv('/tmp/filtered_posts.csv', index=False)
    print("Data saved to /tmp/filtered_posts.csv")

# Define tasks
extract_task = PythonOperator(
    task_id='extract_data',
    python_callable=extract_data,
    dag=dag,
)

transform_task = PythonOperator(
    task_id='transform_data',
    python_callable=transform_data,
    provide_context=True,
    dag=dag,
)

load_task = PythonOperator(
    task_id='load_data',
    python_callable=load_data,
    provide_context=True,
    dag=dag,
)

# Set task dependencies
extract_task >> transform_task >> load_task


# Step 3: Run the DAG (in bash)
# airflow scheduler
# airflow webserver