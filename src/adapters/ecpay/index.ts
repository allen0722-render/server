import ECPay from './ECPAY_Payment_node_js';   

interface CVS_INFO {
    StoreExpireDate: string;
    Desc_1: string;
    Desc_2: string;
    Desc_3: string;
    Desc_4: string;
    PaymentInfoURL: string;
}

interface CVS_PARAMS {
    MerchantTradeNo: string;
    MerchantTradeDate: string;
    TotalAmount: string;
    TradeDesc: string;
    ItemName: string;
    ReturnURL: string;
}

interface CreateBillParams {
    cvsInfo?: CVS_INFO;
    cvsParams: CVS_PARAMS;
    inv_param?: {};
    client_redirect_url?: string;
}

interface IECPayAdapterOptions {
    OperationMode: "Test" | "Production";
    MercProfile:{
        MerchantID: string;
        HashKey: string;
        HashIV: string;
    };
    IgnorePayment: [];
    IsProjectContractor: boolean;
}

const defaultOptions: IECPayAdapterOptions = {
    OperationMode: "Test",
    MercProfile: {
        MerchantID: "2000132",
        HashKey: "5294y06JbISpM5x9",
        HashIV: "v77hoKGq4kWxNNIS",
    },
    IgnorePayment: [],
    IsProjectContractor: false,
};

export interface IECPayAdapter{
    createCVS(createBillParams: CreateBillParams): string;
}

export class ECPayAdapter implements IECPayAdapter{

    private ecpayInstance;

    constructor(options: IECPayAdapterOptions = defaultOptions) {
        this.ecpayInstance = new ECPay(options);
    }

    createCVS = (createParams: CreateBillParams) => {
        const {
            cvsInfo = {
                StoreExpireDate: "",
                Desc_1: "",
                Desc_2: "",
                Desc_3: "",
                Desc_4: "",
                PaymentInfoURL: "",
            },
            cvsParams,
            inv_param = {},
            client_redirect_url = "",
        } = createParams;

        const html = this.ecpayInstance.payment_client.aio_check_out_cvs(
            cvsInfo,
            cvsParams,
            inv_param,
            client_redirect_url,
        );
        
        return html;
    };
}