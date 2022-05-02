import express, {json} from 'express'
import { MongoClient } from "mongodb"
import cors from 'cors'
import chalk from 'chalk'
import dayjs from 'dayjs'
import Joi from 'joi'
import dotenv from "dotenv"

const app = express()
app.use(cors())
app.use(json())
dotenv.config()

console.log(process.env.MONGO_URI)

const mongoClient = new MongoClient(process.env.MONGO_URI)
let db

mongoClient.connect()
    .then(() => {db = mongoClient.db(process.env.DB)})
    .catch(err => {console.log("Erro ao conectar com o banco de dados", err)})

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

app.get("/messages", (req, res) => {
    const {limit} = req.query

    db.collection("mensagens")
        .find().toArray()
        .then(mensagens => {
            if (mensagens.length < limit) {
                res.send([...mensagens].splice(0, mensagens.length))
                return
            }

            res.send([...mensagens].splice(0, mensagens.length - limit))
        })
})

app.post("/status", (req, res) => {
    let {user} = req.headers

    db.collection("usuariosOnline")
        .findOne({name: user})
        .then(usuario => {
            if (!usuario) {
                res.sendStatus(404)
                return
            }

            db.collection("usuariosOnline")
                .updateOne({name: user}, {$set: {"lastStatus": Date.now()}})
                .then(() => {res.sendStatus(200)})
                .catch(err => {console.log("Erro ao atualizar status", err)})
        })
        .catch(err => {
            console.log("Erro ao procurar usuário", err)
        })
})

setInterval(() => {
    db.collection("usuariosOnline")
        .find({lastStatus: {$lt: Date.now() - 10000}}).toArray()
        .then(usuarios => {
            const usuariosIds = usuarios.map(usuario => usuario._id)

            db.collection("usuariosOnline")
                .deleteMany({_id: {$in: usuariosIds}})
                .then(() => {
                    const mensagens = usuarios.map(usuario => {
                        return {
                            from: usuario.name,
                            to: 'Todos', 
                            text: 'sai da sala...', 
                            type: 'status', 
                            time: dayjs().format("HH:mm:ss")
                        }
                    })

                    if (mensagens.length > 0) {
                        db.collection("mensagens")
                            .insertMany(mensagens)
                    }
                })
        })
}, 15000)

app.listen(process.env.PORTA, () => {
    console.log(chalk.bold.green(`Aplicação rodando na porta ${process.env.PORTA}`))
})