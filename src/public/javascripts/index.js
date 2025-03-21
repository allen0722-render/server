const serverDomain = "http://localhost:3000";

var vue = new Vue({
    el: '#app',
    data() {
        return {
            serverDomain: serverDomain,
            ecpayHtml: "",
            buyItems: {},
            products: [],
            currentPage: 1,
            itemsPerPage: 10, 
        };
    },
    async mounted() {
        this.products = await fetch(`${serverDomain}/products/list`).then((res) =>
            res.json()
        );

        paypal.Buttons({
            createOrder: async (data, actions) => {
                const items = this.getItemDetailByBuyItems();

                const result = await this.sendPayment(
                    `${serverDomain}/orders/create`,
                    {
                        paymentProvider: "PAYPAL",
                        paymentWay: "PAYPAL",
                        contents: items,
                    }
                );
                return result.data;
            },
            onApprove: (data, actions) => {
                return actions.order.capture();
            }
        }).render('#paypal-area');
    },
    computed: {
        paginatedProducts() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.products.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.products.length / this.itemsPerPage);
        }
    },
    methods: {
        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
            }
        },
        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
            }
        },
        getItemDetailByBuyItems() {
            return Object.entries(this.buyItems).map(([id, amount]) => ({
                productId: Number(id),
                price: this.products.find(product => product.id === Number(id)).price,
                amount: Number(amount),
            }));
        },
        async sendPayment(url, data) {
            try {
                console.log('Sending data:', data);  
                const result = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                }).then(res => {
                    if (res.ok) return res.json();
                    return res.json().then((json) => Promise.reject(json));
                });

                return result;
            } catch (e) {
                console.log(e);
                throw new Error(e);
            }
        },
        async ECPay() {
            console.log('綠界支付', this.buyItems);
            if (!Object.keys(this.buyItems).length) return alert("沒有選項");

            const items = this.getItemDetailByBuyItems();

            const result = await this.sendPayment(`${this.serverDomain}/orders/create`, {
                paymentProvider: "ECPAY",
                paymentWay: "CVS",  
                contents: items,
            });

            const { data: html } = result;

            this.ecpayHtml = html;

            this.$nextTick(() => {
                const form = document.getElementById("_form_aiochk");
                if (form) {
                    form.submit();
                } else {
                    console.error("Form with ID '_form_aiochk' not found.");
                }
            });

            console.log("ECPay HTML:", this.ecpayHtml);
                },
            },
});
