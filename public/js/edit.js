document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const labName = document.getElementById('labName');
  const sizeDisplay = document.getElementById('sizeDisplay');
  const stars = document.querySelectorAll('.star');
  const difficultyInput = document.getElementById('difficulty');
  const remarks = document.getElementById('remarks');
  const mazeCanvas = document.getElementById('mazeCanvas');
  const ctx = mazeCanvas.getContext('2d');
  const saveButton = document.getElementById('saveButton');
  const cancelButton = document.getElementById('cancelButton');
  const resultMessage = document.getElementById('resultMessage');

  // Current state
  let mazeId = null;
  let mazeData = null;
  let parsedMaze = null;
  let cellSize = 10;
  let currentUsername = localStorage.getItem('username') || '';

  // Initialize the page
  init();

  function init() {
    // Get maze ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    mazeId = urlParams.get('id');

    if (!mazeId) {
      showMessage('No maze ID provided. Please select a maze to edit.', false);
      return;
    }

    // Load maze data
    loadMaze(mazeId);

    // Set up event listeners
    saveButton.addEventListener('click', saveMazeChanges);
    cancelButton.addEventListener('click', () => {
      window.location.href = 'play.html';
    });

    // Star rating handling
    stars.forEach(star => {
      star.addEventListener('click', function() {
        const value = parseInt(this.dataset.value);
        difficultyInput.value = value;

        // Update star appearance
        stars.forEach(s => {
          if (parseInt(s.dataset.value) <= value) {
            s.textContent = '★';
            s.classList.add('filled');
          } else {
            s.textContent = '☆';
            s.classList.remove('filled');
          }
        });
      });
    });
  }

  async function loadMaze(id) {
    try {
      const response = await fetch(`/api/labyrinths/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Maze not found');
        }
        throw new Error('Failed to load maze data');
      }

      mazeData = await response.json();

      // Check if the current user is the creator
      if (mazeData.creatorName !== currentUsername) {
        showMessage('You can only edit mazes you created.', false);
        saveButton.disabled = true;
        return;
      }

      // Fill in the form with maze data
      labName.value = mazeData.name;
      sizeDisplay.textContent = mazeData.size;
      difficultyInput.value = mazeData.difficulty;
      remarks.value = mazeData.remarks || '';

      // Set stars display
      stars.forEach(star => {
        const starValue = parseInt(star.dataset.value);
        if (starValue <= mazeData.difficulty) {
          star.textContent = '★';
          star.classList.add('filled');
        } else {
          star.textContent = '☆';
          star.classList.remove('filled');
        }
      });

      // Parse and display the maze
      parsedMaze = parseMazeData(mazeData.data);
      drawMaze(parsedMaze);

    } catch (error) {
      console.error('Error loading maze:', error);
      showMessage(`Error: ${error.message}`, false);
      saveButton.disabled = true;
    }
  }

  function parseMazeData(data) {
    return data.trim().split('\n').map(line => line.split(''));
  }

  function drawMaze(maze) {
    // Calculate cell size based on canvas dimensions and maze size
    const width = Math.max(...maze.map(row => row.length));
    const height = maze.length;

    // Resize canvas to fit maze
    const maxWidth = mazeCanvas.parentElement.clientWidth;
    const maxHeight = 400;

    cellSize = Math.min(
      Math.floor(maxWidth / width),
      Math.floor(maxHeight / height)
    );

    mazeCanvas.width = width * cellSize;
    mazeCanvas.height = height * cellSize;

    // Clear canvas
    ctx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);

    // Draw maze
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const cell = maze[y][x];

        if (cell === '#') {
          // Wall
          ctx.fillStyle = '#000';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else if (cell === 'S') {
          // Start
          ctx.fillStyle = '#0f0';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else if (cell === 'E') {
          // End
          ctx.fillStyle = '#f00';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
        // Paths are left transparent
      }
    }
  }

  async function saveMazeChanges() {
    // Validate inputs
    if (!labName.value) {
      showMessage('Please enter a name for the maze', false);
      return;
    }

    if (parseInt(difficultyInput.value) === 0) {
      showMessage('Please select a difficulty rating', false);
      return;
    }

    try {
      // Prepare data for update
      const updatedMaze = {
        name: labName.value,
        difficulty: parseInt(difficultyInput.value),
        remarks: remarks.value,
        data: mazeData.data, // Keep original maze data
        solutionLength: mazeData.solutionLength, // Keep original solution length
        creatorName: currentUsername // Include for authorization check
      };

      // Send update request
      const response = await fetch(`/api/labyrinths/${mazeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedMaze)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update maze');
      }

      showMessage('Maze updated successfully!', true);

      // Redirect back to play page after a short delay
      setTimeout(() => {
        window.location.href = 'play.html';
      }, 1500);

    } catch (error) {
      console.error('Error updating maze:', error);
      showMessage(`Error: ${error.message}`, false);
    }
  }

  function showMessage(message, isSuccess) {
    resultMessage.textContent = message;
    resultMessage.className = isSuccess ? 'result-message success' : 'result-message error';
    resultMessage.classList.remove('hidden');

    // Scroll to message
    setTimeout(() => {
      resultMessage.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
});
