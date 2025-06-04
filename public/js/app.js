
let table;

/**
 * Shows or hides the login page
 * @param {boolean} visible - Show or hide the login page
 */

function setLogin(visible) {
    // #region Show/Hide Login
    const login = document.getElementById('login-area');
    const app = document.getElementById('app-area');
    if (visible) {
        login.style.display = 'block';
        app.style.display = 'none';
    } else {
        login.style.display = 'none';
        app.style.display = 'block';
    }
    // #endregion
}

let tagTypesData = []


document.addEventListener('DOMContentLoaded', () => {
    // #region page loaded

    fetch('/authenticate').then(response => {
        if (response.status === 401) {
            console.log('Not authenticated');
            setLogin(true);
        } else {
            console.log('Authenticated');
            setLogin(false);
        }

    });

    //initialize table
    table = new Tabulator('#table',
        {
            pagination: 'local',
            paginationSize: 15,
            columns: [
                { title: 'Estimate ID', field: 'id' },
                { title: 'Estimate Name', field: 'name' },
                { title: 'Estimate Status', field: 'estimateStatus' },
                { title: 'Created Date', field: 'createdDate' },
                { title: 'Total Cost Estimated', field: 'subtotal' },
                { title: 'Customer ID', field: 'customerId' },
                { title: 'Customer Name', field: 'customerName' },
                { title: 'Customer Type', field: 'customerType' },
                { title: 'Customer Street', field: 'customerStreet' },
                { title: 'Customer City', field: 'customerCity' },
                { title: 'Customer State', field: 'customerState' },
                { title: 'Customer Zip', field: 'customerZip' },
                { title: 'Do Not Mail', field: 'doNotMail' }

            ] //create columns from data field names
        });


    // Trigger download
    document.getElementById('download-csv').addEventListener('click', function () {
        table.download('csv', 'data.csv');
    });
    document.getElementById('download-csv').disabled = true


    // #endregion
});

document.getElementById('login-btn').addEventListener('click', () => {
    // #region user clicks Login button
    const clientId = document.getElementById('client-id').value;
    const clientSecret = document.getElementById('client-secret').value;

    const data = { clientId, clientSecret };

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (response.status === 401) {
                console.log('Unauthorized');
                setLogin(true);
                return;
            }
            setLogin(false);
            response.json()
        })

    // #endregion
}
);

document.getElementById('fetch-btn').addEventListener('click', () => {
    // #region user clicks Get button

    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const tenantID = document.getElementById('tenant-id').value;


    const data = { startDate, endDate, tenantID };

    // Show loading spinner
    document.getElementById('loading-spinner').style.display = 'flex';



    // Fetch data from estimates endpoint
    fetch('/estimates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(async estimatesData => {
            const estimates = estimatesData.data
            const customerIds = estimates.map(estimate => estimate.customerId) // Get all customer ids from the jobs array
            const estimatesArray = estimates.map(estimate => {
                estimate.estimateStatus = estimate.status.name // Set estimate status
                estimate.createdDate = new Date(estimate.createdOn).toLocaleDateString('en-US') // Format created date
                return estimate
            })
            //console.log(estimates)
            //console.log(estimatesArray)

            // console.log(customerIds)

            // Fetch customer name, address, job location, and total cost data for each job from the customers endpoint
            const customerResponse = await fetch('/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ customerIds, tenantID })
            });
            const customerData = await customerResponse.json();
            const customerMap = new Map();
            customerData.data.forEach(customer => {
                customerMap.set(customer.id, customer);
            });

            const jobsWithCustomerData = estimatesArray.map(estimate => {
                // Find the customer data for the current estimate
                const customer = customerMap.get(estimate.customerId)
                if (customer) {
                    estimate.customerData = customer; // Add customer data to the job object
                    estimate.customerName = customer.name // Set and add customer name to job object
                    estimate.customerStreet = customer.address.street // Set and add customer street to job object
                    estimate.customerCity = customer.address.city // Set and add customer city to job object
                    estimate.customerState = customer.address.state // Set and add customer state to job object
                    estimate.customerZip = customer.address.zip // Set and add customer zip to job object
                    estimate.customerType = customer.type // Set and add customer type to job object
                    estimate.doNotMail = customer.doNotMail // Set and add if the customeris on the do not mail list to the job object
                }
                return estimate;
            }
            );
            console.log(jobsWithCustomerData)


            // Put data into table
            table.setData(jobsWithCustomerData);

            // Hide loading spinner
            document.getElementById('loading-spinner').style.display = 'none';
            document.getElementById('download-csv').disabled = false
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            // Hide loading spinner
            document.getElementById('loading-spinner').style.display = 'none';
        });
    // #endregion
});


