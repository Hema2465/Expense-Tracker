const form = document.getElementById('transaction-form');
const tbody = document.getElementById('transaction-list');
const categorySelect = document.getElementById('category');
const filterCategory = document.getElementById('filter-category');
const toast = document.getElementById('toast');

// Global State
let transactions = JSON.parse(localStorage.getItem('pro_transactions')) || [];
let categories = JSON.parse(localStorage.getItem('pro_categories')) || ['Food', 'Transport', 'Utilities', 'Salary', 'Entertainment', 'Other'];
let chartInstance = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

if (isDarkMode) document.body.classList.add('dark-mode');
document.getElementById('date').valueAsDate = new Date();

// Initialize
populateCategories();
updateUI();

// Event Listeners
form.addEventListener('submit', handleTransaction);
document.getElementById('add-category-btn').addEventListener('click', addNewCategory);
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('export-btn').addEventListener('click', exportCSV);

// Filter Event Listeners
['search', 'filter-type', 'filter-category', 'filter-start', 'filter-end'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateUI);
});

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function populateCategories() {
    categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
    filterCategory.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        filterCategory.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function addNewCategory() {
    const newCat = prompt("Enter new category name:");
    if (newCat && newCat.trim() !== '' && !categories.includes(newCat.trim())) {
        categories.push(newCat.trim());
        localStorage.setItem('pro_categories', JSON.stringify(categories));
        populateCategories();
        categorySelect.value = newCat.trim();
        showToast('Category added!');
    }
}

function handleTransaction(e) {
    e.preventDefault();
    const idField = document.getElementById('tx-id').value;
    const tx = {
        id: idField ? parseInt(idField) : Date.now(),
        desc: document.getElementById('desc').value,
        amount: document.getElementById('amount').value,
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value
    };

    if (idField) {
        const index = transactions.findIndex(t => t.id === parseInt(idField));
        transactions[index] = tx;
        showToast('Transaction updated!');
    } else {
        transactions.push(tx);
        showToast('Transaction added!');
    }

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('pro_transactions', JSON.stringify(transactions));
    
    form.reset();
    document.getElementById('tx-id').value = '';
    document.getElementById('submit-btn').textContent = 'Add Transaction';
    document.getElementById('form-title').textContent = 'New Transaction';
    document.getElementById('date').valueAsDate = new Date();
    updateUI();
}

function editTx(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    document.getElementById('tx-id').value = tx.id;
    document.getElementById('desc').value = tx.desc;
    document.getElementById('amount').value = tx.amount;
    document.getElementById('type').value = tx.type;
    document.getElementById('category').value = tx.category;
    document.getElementById('date').value = tx.date;
    
    document.getElementById('submit-btn').textContent = 'Update Transaction';
    document.getElementById('form-title').textContent = 'Edit Transaction';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteTx(id) {
    if(confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem('pro_transactions', JSON.stringify(transactions));
        updateUI();
        showToast('Transaction deleted!');
    }
}

function updateUI() {
    tbody.innerHTML = '';
    let income = 0, expense = 0;
    const categoryTotals = {};
    
    // Filter Values
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const filterType = document.getElementById('filter-type').value;
    const filterCat = document.getElementById('filter-category').value;
    const startDate = document.getElementById('filter-start').value;
    const endDate = document.getElementById('filter-end').value;

    transactions.forEach(t => {
        // Apply Filters
        const matchSearch = t.desc.toLowerCase().includes(searchTerm);
        const matchType = filterType === 'all' || t.type === filterType;
        const matchCat = filterCat === 'all' || t.category === filterCat;
        const matchStart = !startDate || new Date(t.date) >= new Date(startDate);
        const matchEnd = !endDate || new Date(t.date) <= new Date(endDate);

        if (matchSearch && matchType && matchCat && matchStart && matchEnd) {
            const isIncome = t.type === 'income';
            
            // Build Table Row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${t.date}</td>
                <td>${t.desc}</td>
                <td>${t.category}</td>
                <td><span class="type-badge ${isIncome ? 'type-income' : 'type-expense'}">${t.type}</span></td>
                <td style="font-weight: bold; color: var(--${isIncome ? 'success' : 'danger'})">
                    ${isIncome ? '+' : '-'}₹${parseFloat(t.amount).toFixed(2)}
                </td>
                <td class="actions-cell">
                    <button class="action-btn edit" onclick="editTx(${t.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteTx(${t.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);

            // Calculate Totals
            if (isIncome) {
                income += parseFloat(t.amount);
            } else {
                expense += parseFloat(t.amount);
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
            }
        }
    });

    document.getElementById('total-income').innerText = `₹${income.toFixed(2)}`;
    document.getElementById('total-expense').innerText = `₹${expense.toFixed(2)}`;
    document.getElementById('balance').innerText = `₹${(income - expense).toFixed(2)}`;
    
    updateChart(categoryTotals);
}

function updateChart(data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const isDark = document.body.classList.contains('dark-mode');
    Chart.defaults.color = isDark ? '#a4b0be' : '#666';

    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{ 
                data: Object.values(data), 
                backgroundColor: ['#ff7675', '#74b9ff', '#a29bfe', '#ffeaa7', '#55efc4', '#fd79a8'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    updateUI();
}

function exportCSV() {
    if (transactions.length === 0) return showToast('No data to export!');
    let csv = 'Date,Description,Category,Type,Amount\n';
    transactions.forEach(t => csv += `${t.date},${t.desc},${t.category},${t.type},${t.amount}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
}