// Initialize CreateJS
let stage;
let cart = [];
const products = [
    { id: 1, name: 'Product 1', price: 10.99 },
    { id: 2, name: 'Product 2', price: 15.99 },
    { id: 3, name: 'Product 3', price: 20.99 },
    { id: 4, name: 'Product 4', price: 25.99 }
];

document.addEventListener('DOMContentLoaded', () => {
    // Initialize CreateJS stage
    stage = new createjs.Stage("products-container");
    createjs.Touch.enable(stage);

    // Render products
    renderProducts();
    
    // Initialize cart display
    updateCartDisplay();

    // Add checkout button listener
    document.getElementById('checkout-btn').addEventListener('click', handleCheckout);

    // Load initial sales history
    loadSalesHistory();
});

function renderProducts() {
    const container = document.getElementById('products-container');
    
    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'p-4 border rounded hover:bg-gray-50 cursor-pointer';
        productDiv.innerHTML = `
            <h3 class="font-semibold">${product.name}</h3>
            <p class="text-gray-600">$${product.price.toFixed(2)}</p>
        `;
        
        productDiv.addEventListener('click', () => addToCart(product));
        container.appendChild(productDiv);
    });
}

function addToCart(product) {
    cart.push({ ...product, timestamp: new Date() });
    updateCartDisplay();
}

function updateCartDisplay() {
    const container = document.getElementById('cart-container');
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    container.innerHTML = cart.map(item => `
        <div class="flex justify-between items-center py-2">
            <span>${item.name}</span>
            <span>$${item.price.toFixed(2)}</span>
        </div>
    `).join('');
    
    document.getElementById('total-amount').textContent = `$${total.toFixed(2)}`;
}

async function handleCheckout() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    try {
        const response = await fetch('/api/sales', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: cart,
                total: cart.reduce((sum, item) => sum + item.price, 0),
                timestamp: new Date()
            })
        });

        if (response.ok) {
            cart = [];
            updateCartDisplay();
            loadSalesHistory();
            alert('Sale completed successfully!');
        } else {
            throw new Error('Failed to process sale');
        }
    } catch (error) {
        console.error('Error processing sale:', error);
        alert('Failed to process sale. Please try again.');
    }
}

async function loadSalesHistory() {
    try {
        const response = await fetch('/api/sales');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const sales = await response.json();
        
        const container = document.getElementById('sales-history');
        if (!Array.isArray(sales)) {
            throw new Error('Sales data is not in the expected format');
        }

        container.innerHTML = `
            <table class="min-w-full">
                <thead>
                    <tr class="border-b">
                        <th class="text-left py-2">Date</th>
                        <th class="text-left py-2">Items</th>
                        <th class="text-right py-2">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(sale => `
                        <tr class="border-b">
                            <td class="py-2">${new Date(sale.timestamp).toLocaleString()}</td>
                            <td class="py-2">${sale.items.length} items</td>
                            <td class="py-2 text-right">$${sale.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading sales history:', error);
        const container = document.getElementById('sales-history');
        container.innerHTML = `<p class="text-red-500">Error loading sales history. Please try again later.</p>`;
    }
}
