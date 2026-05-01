export async function getPapers() {
    const res = await fetch('/api/papers')
    return res.json()
}