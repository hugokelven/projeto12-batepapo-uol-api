import express, {json} from 'express'
import { MongoClient } from "mongodb"
import cors from 'cors'
import chalk from 'chalk'
import dayjs from 'dayjs'
import Joi from 'joi'
// import dotenv from "dotenv"

const app = express()
app.use(cors())
app.use(json())
// dotenv.config()

const mongoClient = new MongoClient("mongodb://localhost:27017")
let db

const promessa = mongoClient.connect()

promessa.then(() => {
	db = mongoClient.db("projeto12-batepapo-uol-api")
})

promessa.catch(err => {
    console.log(err)
})

app.post("/participants", (req, res) => {
    const {name} = req.body

    if (!name) {
        res.sendStatus(405)
        return
    }

	db.collection("usuariosOnline").insertOne(
        {
            name, 
            lastStatus: Date.now()
        }
    ).then(() => {

        db.collection("mensagens").insertOne(
            {
                from: name,
                to: 'Todos', 
                text: 'entra na sala...', 
                type: 'status', 
                time: dayjs().format("HH:mm:ss")
            }
        )

		res.sendStatus(201)
	}).catch(() => {
        res.send("Deu erro")
    })
})

app.get("/participants", (req, res) => {
    db.collection("usuariosOnline").find().toArray().then(usuariosOnline => {
        res.send(usuariosOnline)
    })
})

app.listen(5000, () => {
    console.log(chalk.bold.green("Aplicação rodando na porta 5000"))
})