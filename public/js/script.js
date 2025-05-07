function submitNewTest() {
    const testRowInput = document.getElementById("testRow");
    const testRow = testRowInput.value;

    fetch("/api/post", {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testRow: testRow }),
    })
    .then(response => {
        if (response.ok) {
            testRowInput.value = "";
            // Reload the table data after successful submission
            loadTableData();
        }
    })
    .catch(error => console.error('Error submitting new test:', error));
}

function loadTableData() {
    fetch('api/get')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector('#dataTable tbody');
            tableBody.innerHTML = ''; // Clear existing table rows
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.testRow}</td>
                    <td>
                        <button onclick="editRow(${item.id}, '${item.testRow}')">Edit</button>
                        <button onclick="deleteRow(${item.id})">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching JSON:', error));
}

function editRow(id, testRow) {
    const newTestRow = prompt("Enter new value for Test Row:", testRow);
    if (newTestRow !== null) {
        fetch(`/api/update/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ updatedTestRow: newTestRow }),
        })
        .then(response => {
            if (response.ok) {
                // Reload the table data after successful update
                loadTableData();
            } else {
                console.error('Failed to update Test Row');
            }
        })
        .catch(error => console.error('Error updating Test Row:', error));
    }
}

function deleteRow(id) {
    if (confirm("Are you sure you want to delete this row?")) {
        fetch(`/api/delete/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                // Reload the table data after successful deletion
                loadTableData();
            } else {
                console.error('Failed to delete Test Row');
            }
        })
        .catch(error => console.error('Error deleting Test Row:', error));
    }
}

document.addEventListener("DOMContentLoaded", function() {
    loadTableData();
});
