export async function GET() {
    return Response.json({
        server_key: process.env.MIDTRANS_SERVER_KEY ?
            process.env.MIDTRANS_SERVER_KEY.substring(0, 20) + '...' :
            'TIDAK ADA'
    })
}