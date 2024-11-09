import express from 'express';
import csv from 'csvtojson'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager } from '@google/generative-ai/server';
import dotenv from 'dotenv';

const app = express();
app.use(express.json());
dotenv.config();

const studentData = await csv().fromFile(process.env.csvFilePath);
const cacheManager = new GoogleAICacheManager(process.env.API_KEY);
const model = "models/gemini-1.5-flash-001";


const displayName = "Dados de possíveis alunos que irão evadir";
// Passa a planilha como cache, para ele sempre lembrar dos dados
const cache = await cacheManager.create({
    model,
    displayName,
    contents: [
        {
            role: 'user',
            parts: [
                {
                    text: JSON.stringify(studentData)
                }
            ]
        }
    ],
    ttl: "300s"
});


const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const genModel = genAI.getGenerativeModelFromCachedContent(cache);

// Inicia o chat
const chat = genModel.startChat();

app.get("/", async (req, res) => {
    return res.status(200).json({historico: await chat.getHistory()});
})


app.post("/perguntar", async (req, res) => {
    const { pergunta } = req.body;

    if(!pergunta){
        return res.status(400).json({ error: "Pergunta é obrigatória." });
    }

    try{
        const resposta = await chat.sendMessage(pergunta);
        
        return res.status(200).json({resposta: resposta.response.text()})
    } catch(error){
        console.error("Erro ao processar a pergunta:", error);
        return res.status(500).json({ error: "Erro ao processar a pergunta." });
    }
})


app.listen(3000, () => {
    console.log("Server run! Port: 3000")
})