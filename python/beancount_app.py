from flask import Flask, request, jsonify
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

import os
env = os.environ.get('FLASK_ENV')

# https://github.com/hoostus/beancount-ynab/blob/master/import.py
from beancount.core.data import Transaction, Posting
from beancount.core.amount import Amount
from beancount.core.number import Decimal
from beancount.core import data
import beancount.loader

file_path_beancount_test = "/app/beancount_data/test.beancount"
print('SONO VIVO')

app = Flask(__name__)

# https://stackoverflow.com/questions/49355010/how-do-i-watch-python-source-code-files-and-restart-when-i-save
# EXAMPLE
countries = [
    {"id": 1, "name": "Thailand", "capital": "Bangkok", "area": 513120},
    {"id": 2, "name": "Australia", "capital": "Canberra", "area": 7617930},
    {"id": 3, "name": "Egypt", "capital": "Cairo", "area": 1010408},
]
def _find_next_id():
    return max(country["id"] for country in countries) + 1
@app.get("/countries")
def get_countries():
    return jsonify(countries)
@app.post("/countries")
def add_country():
    if request.is_json:
        country = request.get_json()
        country["id"] = _find_next_id()
        countries.append(country)
        return country, 201
    return {"error": "Request must be JSON"}, 415
####


@app.get("/provaaa")
def provaaa():
    logging.info('AOOOOOOA ' + env)
    return "sono d'accordo OF ORSE NOOOO? HO SBAGLIATO AVERE", 200

@app.post("/prova")
def prova():
    logging.info("test")
    logging.info("la richiesta è un json")
    request_payload = request.get_json()
    logging.info("ho preso il payload")
    logging.info(str(request_payload))
    date = request_payload['data']
    payee = request_payload['descr']
    account = request_payload['categoria']
    amount = Decimal(request_payload['amount'])
    logging.info('Amount: ' + str(amount))

    #date = "2023-07-27"
    #payee = "Amazon"
    #account = "Expenses:Shopping"
    #amount = Decimal("20.00")
    narration="Acquisto su Amazon"
    currency = "USD"

    transaction = Transaction(
        meta=data.new_metadata("transaction::123456789", lineno=1),  # Inserisci un valore univoco come ID della transazione
        flag=None,  # Puoi specificare una stringa come flag se necessario
        date=date,
        payee=payee,
        narration=narration,
        tags=set(),
        links=set(),
        postings=[
            Posting(account, Amount(amount, currency), None, None, None, None),
            Posting("Assets:Bank", None, None, None, None, None),
        ],
    )

    entries = [transaction]
    transaction_str = "{} * \"{}\" \"{}\"\n  {} {}\n  Assets:Bank\n\n".format(
        date, payee, transaction.narration, account, Amount(amount, currency)
    )
    transss = f"{date} * \"{payee}\" \"{transaction.narration}\"\n  {account} {Amount(amount, currency)}\n  Assets:Bank\n\n"
    

    with open("/app/beancount_data/test.beancount", "a") as f:
        f.write(transaction_str)

    response_data = {
            'message': 'Transaction processed and saved successfully.',
            'transaction_str': transaction_str
        }
    return jsonify(response_data), 201


# NON FUNZIONA
@app.get("/duplicati")
def duplicati():
    logging.info('inizio duplicati. Guarda: ' + file_path_beancount_test)
    entries, _, options_map = beancount.loader.load_file(file_path_beancount_test)
    logging.info('trovate le info necessarie')
    combined_transactions = combine_duplicate_transactions(entries)
    #  combined_transactions_str = "\n".join(map(str, combined_transactions))
    #logging.info("ECCOOOO: " + combined_transactions_str)
    #entries.extend(combined_transactions)
    #beancount.loader.write_file(entries, options_map, file_path)
    return jsonify(combined_transactions), 200
#NON FUNZIONA
def combine_duplicate_transactions(entries):
    # Dizionario per tenere traccia delle transazioni duplicate e dei loro importi sommati
    duplicate_transactions = {}

    for entry in entries:
        #logging.info('entry: ('+ str(isinstance(entry, data.Transaction)) +') ' + str(entry))
        # Verifica se l'entry è una transazione di tipo "Posting"
        if isinstance(entry, data.Transaction) and len(entry.postings) != 0:
            posting = entry.postings[0]
            key = (entry.date, entry.payee, posting.account)
            logging.info('trovata una transazione posting. ' + str(posting) + " ---- " + str(key))

            # Verifica se la transazione è duplicata
            if key in duplicate_transactions:
                # Somma gli importi delle transazioni duplicate
                duplicate_transactions[key] += posting.units[0]
            else:
                duplicate_transactions[key] = posting.units[0]

    logging.info('risultato intermedio finale: ')
    #for key, value in duplicate_transactions.items():
    #    logging.info(f"{key}: {value}")
    duplicate_transactions = {str(key): value for key, value in duplicate_transactions.items()}
    logging.info(f"duplicate_transactions: {duplicate_transactions}")

    # Crea una nuova transazione combinata per ogni coppia di transazioni duplicate
    combined_transactions = []
    for key, amount in duplicate_transactions.items():
        date, payee, account = key
        combined_transaction = data.Transaction(
            meta=data.new_metadata('generated', None),
            date=date,
            payee=payee,
            flag=None,
            tags=data.EMPTY_SET,
            links=data.EMPTY_SET,
            narration=None,
            postings=[
                data.Posting(account, Amount(Decimal(amount), "USD"), None, None, None, None)
            ]
        )
        combined_transactions.append(combined_transaction)

    return combined_transactions
####


@app.post("/crealo")
def crealo():
    request_payload = request.get_json()
    username = request_payload['user']
    logging.info('utente per cui creare il file: ' + username)
    user_file_path = f"/app/beancount_data/{username}.txt"
    with open(user_file_path, 'w') as file:
        file.write('ho creatooooo')
    os.chmod(user_file_path, 0o600)
    print("File utente creato e autorizzazioni impostate.")
    check_file_permissions(user_file_path)
    return 'success', 201

def check_file_permissions(file_path):
   if os.access(file_path, os.R_OK):
      logging.info(f"Read permission is granted for file: {file_path}")
   else:
      logging.info(f"Read permission is not granted for file: {file_path}")
   if os.access(file_path, os.W_OK):
      logging.info(f"Write permission is granted for file: {file_path}")
   else:
      logging.info(f"Write permission is not granted for file: {file_path}")
   if os.access(file_path, os.X_OK):
      logging.info(f"Execute permission is granted for file: {file_path}")
   else:
      logging.info(f"Execute permission is not granted for file: {file_path}")


if __name__ == "__main__":
    if env == 'development':
        app.run(host='0.0.0.0', port=3003)
    elif env == 'production':
        from waitress import serve
        serve(app, host="0.0.0.0", port=3003)
# https://stackoverflow.com/questions/51025893/flask-at-first-run-do-not-use-the-development-server-in-a-production-environmen
# valutare Gunicorn: https://stackoverflow.com/questions/70396641/how-to-run-gunicorn-inside-python-not-as-a-command-line