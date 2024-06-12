import { UnauthorizedException } from '@nestjs/common';

const redirectUri = `http://localhost:3000/api/redirect`;

export class AmoCRMClient {
  baseUrl = `https://${process.env.AMOCRM_LOGIN}.amocrm.ru`;
  headers = new Headers();


  async getTokensByAuthCode() {
    const endpoint = `${this.baseUrl}/oauth2/access_token`;
    const request = new Request(endpoint, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AMOCRM_ID,
        client_secret: process.env.AMOCRM_SECRET_KEY,
        grant_type: 'authorization_code',
        code: process.env.AUTH_CODE,
        redirect_uri: redirectUri,
      }),
    });

    const response = await fetch(request);
    const json = await response.json();
    return json;
  }

  async refreshAccessToken() {
    const endpoint = `${this.baseUrl}/oauth2/access_token`;

    const request = new Request(endpoint, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AMOCRM_ID,
        client_secret: process.env.AMOCRM_SECRET_KEY,
        grant_type: 'refresh_token',
        refresh_token: process.env.AMOCRM_REFRESH_TOKEN,
        redirect_uri: redirectUri,
      }),
    });

    const response = await fetch(request);
    const tokens = await response.json();
    process.env.AMOCRM_ACCESS_TOKEN = tokens.access_token;
    process.env.AMOCRM_REFRESH_TOKEN = tokens.refresh_token;
  }

  async setTokens(): Promise<void> {
    const tokens = await this.getTokensByAuthCode();
    if (tokens.status == 400) {
      throw new Error('Неверный код авторизации (задается в .dev.env)');
    }
    process.env.AMOCRM_ACCESS_TOKEN = tokens.access_token;
    process.env.AMOCRM_REFRESH_TOKEN = tokens.refresh_token;
  }

  async getLeads(query: string, isRetry = false) {

    // Получение токенов (если их нет) по коду авторизации
    if (process.env.AMOCRM_ACCESS_TOKEN == '0') {
      await this.setTokens();
    }

    // Получение сделок
    try {
      let endpoint = `${this.baseUrl}/api/v4/leads`;
      if (query) {
        endpoint += `?query=${query}`;
      }

      const request = new Request(endpoint, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
        },
      });

      const response = await fetch(request);
      if (response.status === 200) {
        const json = await response.json();
        const leads = json._embedded.leads;

        // Создание представления
        for (const lead of leads) {
          const status = await this.getLeadStatus(lead);
          lead.status_name = status.name;
          lead.status_color = status.color;
          lead.responsible_user_name = await this.getLeadResponsibleUser(lead);
        }
        return leads;
      }


      if (response.status === 401) {
        if (isRetry) {
          throw new UnauthorizedException();
        }
        // Если истек токен, попытка обновить и отправить запрос заново.
        await this.refreshAccessToken();
        await this.getLeads(query, true);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async getLeadStatus(lead) {
    const pipeline = await this.getPipeline(lead.pipeline_id);
    const statuses = pipeline.statuses;
    return statuses.find(({ id }) => id === lead.status_id);
  }

  async getPipeline(pipeline_id: string) {
    const endpoint = `${this.baseUrl}/api/v4/leads/pipelines/${pipeline_id}`;
    const request = new Request(endpoint, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
      },
    });

    const response = await fetch(request);
    if (response.status === 200) {
      const json = await response.json();
      return json._embedded;
    }
  }

  async getLeadResponsibleUser(lead): Promise<string> {
    const user = await this.getUser(lead.responsible_user_id);
    return user.name;
  }

  async getUser(userId: string) {
    const endpoint = `${this.baseUrl}/api/v4/users/${userId}`;
    const request = new Request(endpoint, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
      },
    });

    const response = await fetch(request);
    if (response.status === 200) {
      const json = await response.json();
      return json;
    }
  }
}
