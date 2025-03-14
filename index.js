const express = require('express')
const bodyParser = require('body-parser');
const dbCon = require('./dbcon');
const app = express()
const port = 3000

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

app.get('/api/get', async (req, res) => {
    const result = await dbCon.getAllUsers();
    console.log("1",result);
    res.json(result);
});

app.post('/api/post', async (req, res) => {
    const { testRow } = req.body;
    console.log("2", req.body);

    if (!testRow) {
        res.status(400).send('Bad Request: testRow is required');
        return;
    }

    await dbCon.insertNewUser(testRow);
    res.sendStatus(201);
});

app.put('/api/update/:userId', async (req, res) => {
    const userId = req.params.userId;
    const { updatedTestRow } = req.body;

    if (!updatedTestRow) {
        res.status(400).send('Bad Request: updatedTestRow is required');
        return;
    }

    await dbCon.updateUser(userId, updatedTestRow);
    res.sendStatus(204);
});

app.delete('/api/delete/:userId', async (req, res) => {
    const userId = req.params.userId;

    await dbCon.deleteUser(userId);
    res.sendStatus(204);
});

app.listen(port, () => {
    console.log(`Listening on ${port}`)
})