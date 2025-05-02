# templates
# allow you to dynamically insert values into your tasks at runtime using Jinja


from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime

with DAG(
    'template_example',
    start_date=datetime(2023, 1, 1),
    schedule_interval='@daily'
) as dag:
    
    task1 = BashOperator(
        task_id='print_date',
        bash_command='echo "Execution date is {{ ds }}"'
    )
    
    task2 = BashOperator(
        task_id='process_file',
        bash_command='process_data.sh --date {{ ds_nodash }}'
    )


###

default_args = {
  'start_date': datetime(2023, 4, 15),
}

cleandata_dag = DAG('cleandata',
                    default_args=default_args,
                    schedule_interval='@daily')

# Create a templated command to execute
# 'bash cleandata.sh datestring'
templated_command = """
bash cleandata.sh {{ ds_nodash }}
"""

# Modify clean_task to use the templated command
clean_task = BashOperator(task_id='cleandata_task',
                          bash_command=templated_command,
                          dag=cleandata_dag)