const express = require('express')
const bodyParser = require('body-parser');
const dbCon = require('./dbcon');
const app = express()
const port = 3000

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

// Existing user endpoints
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

app.post('/api/labyrinths', async (req, res) => {
    try {
        const { name, data, size, difficulty, remarks, creatorName, solutionLength } = req.body;

        // Ensure solution length is provided
        if (!solutionLength) {
            return res.status(400).json({ message: 'Solution length is required' });
        }

        // Validation
        if (!name || !data || !size || !difficulty) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Creator name should be provided in request (coming from localStorage on client)
        if (!creatorName) {
            return res.status(400).json({ message: 'Creator name is required' });
        }

        // Insert labyrinth into database
        const result = await dbCon.insertLabyrinth({
            name,
            data,
            size,
            difficulty,
            remarks: remarks || '',
            solutionLength,
            creatorName
        });

        res.status(201).json({ 
            message: 'Labyrinth saved successfully',
            id: result.id
        });
    } catch (error) {
        console.error('Error saving labyrinth:', error);
        res.status(500).json({ message: 'Server error while saving labyrinth' });
    }
});

app.get('/api/labyrinths', async (req, res) => {
    try {
        // Get all labyrinths (possibly with pagination if implemented)
        const labyrinths = await dbCon.getAllLabyrinths();
        res.json(labyrinths);
    } catch (error) {
        console.error('Error fetching labyrinths:', error);
        res.status(500).json({ message: 'Server error while fetching labyrinths' });
    }
});

app.get('/api/labyrinths/:id', async (req, res) => {
    try {
        const labyrinthId = req.params.id;
        const labyrinth = await dbCon.getLabyrinthById(labyrinthId);

        if (!labyrinth) {
            return res.status(404).json({ message: 'Labyrinth not found' });
        }

        res.json(labyrinth);
    } catch (error) {
        console.error(`Error fetching labyrinth ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error while fetching labyrinth' });
    }
});

// Update a labyrinth (only if creator matches)
app.put('/api/labyrinths/:id', async (req, res) => {
    try {
      const labyrinthId = req.params.id;
      const { name, difficulty, remarks, creatorName } = req.body;

      if (!name || !difficulty || !creatorName) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // First check if this user is the creator
      const labyrinth = await dbCon.getLabyrinthById(labyrinthId);

      if (!labyrinth) {
        return res.status(404).json({ message: 'Labyrinth not found' });
      }

      if (labyrinth.creatorName !== creatorName) {
        return res.status(403).json({ message: 'You can only edit your own labyrinths' });
      }

      // Update the labyrinth (keeping original data, size, and solutionLength)
      await dbCon.updateLabyrinth(labyrinthId, {
        name,
        data: labyrinth.data, // Keep original maze data
        size: labyrinth.size, // Keep original size
        difficulty,
        remarks: remarks || '',
        solutionLength: labyrinth.solutionLength // Keep original solution length
      });

      res.status(200).json({ message: 'Labyrinth updated successfully' });

    } catch (error) {
      console.error(`Error updating labyrinth ${req.params.id}:`, error);
      res.status(500).json({ message: 'Server error while updating labyrinth' });
    }
  });

// Delete a labyrinth (only if creator matches)
app.delete('/api/labyrinths/:id', async (req, res) => {
  try {
    const labyrinthId = req.params.id;
    const { creatorName } = req.body;

    if (!creatorName) {
      return res.status(400).json({ message: 'Creator name is required' });
    }

    // First check if this user is the creator
    const labyrinth = await dbCon.getLabyrinthById(labyrinthId);

    if (!labyrinth) {
      return res.status(404).json({ message: 'Labyrinth not found' });
    }

    if (labyrinth.creatorName !== creatorName) {
      return res.status(403).json({ message: 'You can only delete your own labyrinths' });
    }

    // Delete the labyrinth
    await dbCon.deleteLabyrinth(labyrinthId, creatorName);

    res.status(200).json({ message: 'Labyrinth deleted successfully' });

  } catch (error) {
    console.error(`Error deleting labyrinth ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while deleting labyrinth' });
  }
});

app.listen(port, () => {
    console.log(`Listening on ${port}`)
})
