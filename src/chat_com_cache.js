import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager } from '@google/generative-ai/server';
import cors from 'cors';
import express from 'express';
import csv from 'csvtojson'
import dotenv from 'dotenv';

const app = express();
app.use(express.json(), cors());
dotenv.config();

const studentData = await csv().fromFile('./data/csv_motivos.csv');
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
});

app.post("/estrategias", async (req, res) => {
    const { motivo } = req.body;

    if(!motivo){
        return res.status(400).json({ error: "O motivo é obrigatória." });
    }

    try{
        const pergunta = `Se baseie nos dados que você recebeu por contexto e me dê 6 possíveis soluções para evitar as evasões onde o motivo é ${motivo}. As 6 soluções devem conter: Título, Descrição e Impacto.  Por exemplo: Título: Descontos por Mérito e Fidalidade; Descrição: Implementar programas de desconto para alunos com excelente desempenho acadêmico ou que permaneçam na instituição por um determinado período.; Impacto: Incentiva a excelência acadêmica e a lealdade dos alunos. Preciso que as soluções sejam retornadas em formato de código JSON, sem markdow e em UTF-8.`;

        const resposta = await chat.sendMessage(pergunta);
        
        return res.status(200).json({resposta: resposta.response.text()});
    }catch(error){
        console.error("Erro ao processar a pergunta:", error);
        return res.status(500).json({ error: "Erro ao processar a pergunta." });
    }
});

app.post("/aprofundar_estrategia", async(req, res) => {
    const { estrategia } = req.body;

    if(!estrategia){
        return res.status(400).json({ error: "A estratégia é obrigatória." });
    }

    try{
        const pergunta = `Aprofunde mais a estrategia que você me deu (${estrategia}). Diga as vantagens e desvantagens.`

        const resposta = await chat.sendMessage(pergunta);
        
        return res.status(200).json({resposta: resposta.response.text()});
    } catch(error){
        console.error("Erro ao processar a pergunta:", error);
        return res.status(500).json({ error: "Erro ao processar a pergunta." });
    }
});


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
});


app.listen(3000, () => {
    console.log("Server run! Port: 3000")
});