declare module "react-native-razorpay" {
  type Options = {
    key: string;
    subscription_id: string;
    name: string;
    description?: string;
    prefill?: { name?: string; email?: string };
  };
  type Result = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
  const RazorpayCheckout: { open: (options: Options) => Promise<Result> };
  export default RazorpayCheckout;
}
