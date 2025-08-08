declare global {
  var __NEXT_DATA__: {
    props: {
      initialProps: {
        csrfToken: string
      }
      pageProps: {
        initialState: {
          common: {
            user: {
              xToken: string
            } | null
          }
        }
      }
    }
  }
}

/**
 * 원하는 graphql 요청을 보냅니다.
 * @param operationName 요청 쿼리 이름입니다.
 * @param query 요청 쿼리입니다.
 * @param variables 요청할 때 매개변수를 작성합니다.
 */
export async function request(operationName: string, query: string, variables: unknown): Promise<{ data: unknown }> {
  const { props: { initialProps: { csrfToken }, pageProps: { initialState: { common: { user } } } } } = __NEXT_DATA__
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Csrf-Token': csrfToken,
  })
  if (user) headers.set('X-Token', user.xToken)
  const res = await fetch('https://playentry.org/graphql/' + operationName, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

export async function deleteProject(id: string) {
  const { data } = await request('DELETE_PROJECT', 'mutation DELETE_PROJECT($id:ID!){deleteProject(id:$id){status,result}}', { id })
  return data
}
