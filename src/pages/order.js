import { supabase } from '../supabase.js'

export async function renderOrders() {
  const { data: orders, error } = await supabase
  .from('orders')
  .select(`
    *,
    business_units (
      name
    )
  `)
  .order('id', { ascending: false })

  if (error) {
    document.querySelector('#app').innerHTML = `
      <div class="p-8 text-red-500">
        ${error.message}
      </div>
    `
    return
  }

  document.querySelector('#app').innerHTML = `
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-6">
        Orders
      </h1>

      <button
        id="createOrderBtn"
        class="bg-blue-600 text-white px-4 py-2 rounded mb-6"
      >
        Create Order
      </button>

      <div class="mt-6">
        ${
          orders.length
            ? orders.map(order => `
              <div
  class="bg-white p-4 rounded shadow mb-3 cursor-pointer"
  data-id="${order.id}"
>
                <h3 class="font-bold">
                  #${order.id} - ${order.order_title}
                </h3>

                <p>Status: ${order.status}</p>
                <p>Contact: ${order.contact_number ?? '-'}</p>
                <p>
                Business Unit:
                ${order.business_units?.name ?? '-'}
              </p>
              </div>
            `).join('')
            : '<p>No Orders Found</p>'
        }
      </div>
    </div>
  `

  document
    .querySelector('#createOrderBtn')
    .addEventListener('click', renderCreateOrderForm)
    document
  .querySelectorAll('[data-id]')
  .forEach(card => {
    card.addEventListener('click', () => {
      renderOrderDetails(card.dataset.id)
    })
  })
}

async function renderCreateOrderForm() {
  const { data: businessUnits, error } = await supabase
    .from('business_units')
    .select('*')
    .order('id')

  console.log('Business Units:', businessUnits)
  console.log('Error:', error)

  document.querySelector('#app').innerHTML = `
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-6">
        Create Order
      </h1>

      <input
        id="orderTitle"
        type="text"
        placeholder="Order Title"
        class="border p-3 rounded w-full mb-3"
      />

      <input
        id="contactNumber"
        type="text"
        placeholder="Contact Number"
        class="border p-3 rounded w-full mb-3"
      />

      <textarea
        id="orderDescription"
        placeholder="Description"
        class="border p-3 rounded w-full mb-3"
      ></textarea>

      <select
        id="businessUnit"
        class="border p-3 rounded w-full mb-3"
      >
        ${businessUnits.map(unit => `
          <option value="${unit.id}">
            ${unit.name}
          </option>
        `).join('')}
      </select>

      <button
        id="saveOrderBtn"
        class="bg-green-600 text-white px-4 py-2 rounded"
      >
        Save Order
      </button>

      <button
        id="cancelBtn"
        class="bg-gray-500 text-white px-4 py-2 rounded ml-2"
      >
        Cancel
      </button>
    </div>
  `

  document
    .querySelector('#cancelBtn')
    .addEventListener('click', renderOrders)

  document
    .querySelector('#saveOrderBtn')
    .addEventListener('click', async () => {

      const title = document.querySelector('#orderTitle').value
      const contact = document.querySelector('#contactNumber').value
      const description = document.querySelector('#orderDescription').value
      const businessUnitId = document.querySelector('#businessUnit').value

      console.log('Selected BU:', businessUnitId)

      const payload = {
        business_unit_id: Number(businessUnitId),
        contact_number: contact,
        order_title: title,
        order_description: description,
        status: 'Draft'
      }

      console.log('Payload:', payload)

      const { data, error } = await supabase
        .from('orders')
        .insert(payload)
        .select()

      console.log('Inserted Data:', data)
      console.log('Insert Error:', error)

      if (error) {
        alert(error.message)
        return
      }

      alert('Order created successfully')
      renderOrders()
    })
}
async function renderOrderDetails(orderId) {
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      business_units (
        name
      )
    `)
    .eq('id', orderId)
    .single()

  if (error) {
    alert(error.message)
    return
  }

  document.querySelector('#app').innerHTML = `
    <div class="p-8">

      <h1 class="text-3xl font-bold mb-6">
        Order Details
      </h1>

      <div class="bg-white p-6 rounded shadow">

        <p><strong>ID:</strong> ${order.id}</p>

        <p><strong>Title:</strong> ${order.order_title}</p>

        <p><strong>Description:</strong> ${order.order_description}</p>

        <p><strong>Contact:</strong> ${order.contact_number}</p>

        <p><strong>Status:</strong> ${order.status}</p>

        <p>
          <strong>Business Unit:</strong>
          ${order.business_units?.name ?? '-'}
        </p>

      </div>

      <div class="mt-6 flex gap-2">

  <button
    id="editBtn"
    class="bg-blue-600 text-white px-4 py-2 rounded
    document
  .querySelector('#editBtn')
  .addEventListener('click', () => {
    renderEditOrder(order.id)
  })
  >
    Edit
  </button>

  <button
    id="backBtn"
    class="bg-gray-500 text-white px-4 py-2 rounded"
  >
    Back
  </button>

</div>

    </div>
  `

  document
    .querySelector('#backBtn')
    .addEventListener('click', renderOrders)
}
async function renderEditOrder(orderId) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error) {
    alert(error.message)
    return
  }

  document.querySelector('#app').innerHTML = `
    <div class="p-8">

      <h1 class="text-3xl font-bold mb-6">
        Edit Order
      </h1>

      <input
        id="orderTitle"
        value="${order.order_title ?? ''}"
        class="border p-3 rounded w-full mb-3"
      />

      <input
        id="contactNumber"
        value="${order.contact_number ?? ''}"
        class="border p-3 rounded w-full mb-3"
      />

      <textarea
        id="orderDescription"
        class="border p-3 rounded w-full mb-3"
      >${order.order_description ?? ''}</textarea>

      <button
        id="saveEditBtn"
        class="bg-green-600 text-white px-4 py-2 rounded"
      >
        Save Changes
      </button>

    </div>
  `

  document
    .querySelector('#saveEditBtn')
    .addEventListener('click', async () => {

      const title = document.querySelector('#orderTitle').value
      const contact = document.querySelector('#contactNumber').value
      const description = document.querySelector('#orderDescription').value

      const { error } = await supabase
        .from('orders')
        .update({
          order_title: title,
          contact_number: contact,
          order_description: description
        })
        .eq('id', orderId)

      if (error) {
        alert(error.message)
        return
      }

      alert('Order updated')
      renderOrderDetails(orderId)
    })
}