#FROM pypy:3
FROM python:3

WORKDIR /app

COPY .docker/python/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

ENV FLASK_APP=src/beancount_app.py
ENV FLASK_ENV=development

#COPY . .
#COPY ./python /app/python
# https://stackoverflow.com/questions/65059112/why-do-not-use-volumes-instead-of-copy-in-the-docker-compose

EXPOSE 3003

# oppure mettere nel docker compose: entrypoint: watchmedo auto-restart --recursive --pattern="*.py" --directory="." python src/beancount_app.py
ENTRYPOINT ["watchmedo", "auto-restart", "--recursive", "--pattern=*.py", "--directory=."]
# https://medium.com/hackernoon/efficient-development-with-docker-and-docker-compose-e354b4d24831
# https://stackoverflow.com/questions/63784529/restart-python-script-inside-docker-container-when-any-file-has-changes

CMD [ "python", "src/beancount_app.py" ] 

#CMD [ "pypy3", "src/beancount_app.py" ]
#CMD [ "flask", "run" ]