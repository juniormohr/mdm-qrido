import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const url = 'https://lbazkpkvkvarimnqzgqb.supabase.co/rest/v1/'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        })
        const data = await response.json()
        const paths = data.paths || {}
        const rpcs = Object.keys(paths).filter(path => path.startsWith('/rpc/'))
        console.log('Available RPCs:')
        rpcs.forEach(rpc => console.log('  ', rpc))
    } catch (e) {
        console.error('Error:', e)
    }
}

run()
