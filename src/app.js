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

    const usuarioSchema = Joi.object({
        name: Joi.string().required()
    })

    const validacao = usuarioSchema.validate(req.body);

    if (validacao.error) {
        console.log(validacao.error.details)
        res.status(422).send(validacao.error.details[0].message)
        return
    }

    db.collection("usuariosOnline").find({name}).toArray().then(usuarios => {
        console.log(usuarios)

        if (usuarios.length > 0) {
            res.sendStatus(409)
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

    }).catch(err => {console.log(err)})
})

app.get("/participants", (req, res) => {
    db.collection("usuariosOnline").find().toArray().then(usuariosOnline => {
        res.send(usuariosOnline)
    })
})

app.post("/messages", (req, res) => {
    const {to, text, type} = req.body
    const {user} = req.headers

    const mensagem = {
        to,
        text,
        type,
        from: user
    }

    const mensagemSchema = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid("message", "private_message").required(),
        from: Joi.string().required()
    })

    const validacao = mensagemSchema.validate(mensagem);

    if (validacao.error) {
        console.log(validacao.error.details)
        res.status(422).send(validacao.error.details[0].message)
        return
    }

    db.collection("mensagens").insertOne({...mensagem, time: dayjs().format("HH:mm:ss")})
})

app.listen(5000, () => {
    console.log(chalk.bold.green("Aplicação rodando na porta 5000"))
})