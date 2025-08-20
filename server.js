const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const db = new sqlite3.Database('./restaurante.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.run(`
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                telefone TEXT NOT NULL,
                email TEXT,
                almoços_acumulados INTEGER DEFAULT 0,
                data_inicio_acm DATETIME,
                UNIQUE(nome, telefone)
            )
        `);
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/gerenciar-cartao', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', '/gerenciar-cartao.html'));
});

app.get('/cadastrar-cliente', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', '/cadastrar-cliente.html'));
})

app.get('/cadastrar-promocao', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', '/cadastrar-promocao.html'));
})

app.get('/log-sistema', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', '/log-sistema.html'));
})

app.post('/api/clientes', (req, res) => {
    const { nome, telefone, email } = req.body;
    if (!nome || !telefone) {
        return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });
    }
    const sql = 'INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)';
    db.run(sql, [nome, telefone, email], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: clientes.nome, clientes.telefone')) {
                return res.status(409).json({ error: 'Erro: Já existe um cliente com este nome e telefone cadastrados.' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, mensagem: `Cliente **${nome}** (ID: ${this.lastID}) cadastrado com sucesso!` });
    });
});

app.get('/api/clientes/buscar-nome/:nome', (req, res) => {
    const { nome } = req.params;
    const termoBusca = `%${nome}%`;
    db.all('SELECT * FROM clientes WHERE nome LIKE ? ORDER BY nome ASC', [termoBusca], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nenhum cliente encontrado com este nome.' });
        }
        res.json(rows);
    });
});

app.get('/api/clientes', (req, res) => {
    // Adicionando ORDER BY para organizar a lista de todos os clientes em ordem alfabética
    db.all('SELECT * FROM clientes ORDER BY nome ASC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.json(row);
    });
});

app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    const { nome, telefone, email } = req.body;
    if (!nome || !telefone) {
        return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });
    }
    db.run('UPDATE clientes SET nome = ?, telefone = ?, email = ? WHERE id = ?', [nome, telefone, email, id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: clientes.nome, clientes.telefone')) {
                return res.status(409).json({ error: 'Erro: Já existe outro cliente com este nome e telefone.' });
            }
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.json({ mensagem: 'Dados do cliente atualizados com sucesso.' });
    });
});

app.delete('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM clientes WHERE id = ?', id, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.json({ mensagem: 'Cliente excluído com sucesso.' });
    });
});

app.post('/api/clientes/:id/registrar', (req, res) => {
    const { id } = req.params;
    const dataAtual = new Date();

    db.get('SELECT nome, almoços_acumulados, data_inicio_acm FROM clientes WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        let almoços = row.almoços_acumulados;
        let dataInicio = row.data_inicio_acm;
        
        if (dataInicio) {
            const dataLimite = new Date(dataInicio);
            dataLimite.setDate(dataLimite.getDate() + 30);
            if (dataAtual > dataLimite) {
                almoços = 0;
                dataInicio = null;
                console.log(`Validade expirada para o cliente ${id}. Pontos resetados.`);
            }
        }
        if (almoços === 0) {
            dataInicio = dataAtual.toISOString();
        }

        if (almoços < 10) {
            almoços += 1;
            db.run('UPDATE clientes SET almoços_acumulados = ?, data_inicio_acm = ? WHERE id = ?', [almoços, dataInicio, id], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                let mensagem;
                if (almoços === 10) {
                    mensagem = `**Parabéns ${row.nome}!** Você tem 10 almoços. O próximo é cortesia!`;
                } else {
                    mensagem = `Almoço registrado. Total de almoços de **${row.nome}**: **${almoços}** de 10.`;
                }
                res.json({ almoços: almoços, mensagem: mensagem });
            });
        } else {
            res.status(400).json({ error: `O cliente ${row.nome} já tem direito à cortesia.` });
        }
    });
});

app.post('/api/clientes/:id/resgatar', (req, res) => {
    const { id } = req.params;
    db.get('SELECT nome, almoços_acumulados FROM clientes WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        if (row.almoços_acumulados === 10) {
            db.run('UPDATE clientes SET almoços_acumulados = 0, data_inicio_acm = NULL WHERE id = ?', [id], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ mensagem: `Cortesia resgatada para **${row.nome}**. O ciclo de 10 almoços foi reiniciado.` });
            });
        } else {
            res.status(400).json({ error: `O cliente ${row.nome} ainda não tem direito à cortesia.` });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});