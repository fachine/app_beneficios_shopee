import { prisma } from './src/prisma.js';
import { calculateSlaDueDate } from './src/services/slaService.js';

async function seed() {
  console.log('Populando dados de teste...');
  await prisma.treatmentLog.deleteMany();
  await prisma.ticket.deleteMany();

  const samples = [
    {
      protocol: 'BENEF-2026-1042',
      employeeName: 'Mariana Costa Ferreira',
      employeeId: '84920',
      workplace: 'Centro de Distribuição Cajamar',
      benefitType: 'VR',
      priority: 'ALTA',
      status: 'NOVO',
      description: 'Olá, meu VR da Flash não caiu no dia 01/09 e já estou há dois dias almoçando com dinheiro do meu bolso. Podem verificar com urgência?',
      summary: 'Crédito de VR Flash não depositado no dia 01/09. Colaboradora sem saldo.',
      missingInfo: null,
      slaHours: 12
    },
    {
      protocol: 'BENEF-2026-2189',
      employeeName: 'Lucas Eduardo Santos',
      employeeId: '77312',
      workplace: 'Loja Shopping Morumbi',
      benefitType: 'VT',
      priority: 'CRITICA',
      status: 'EM_ANALISE',
      description: 'Meu cartão TOP de São Paulo foi bloqueado por perda e preciso da 2 via urgente, pois amanhã cedo tenho plantão e estou sem passagem.',
      summary: 'Cartão TOP bloqueado por perda. Necessidade de 2ª via imediata para plantão.',
      missingInfo: null,
      slaHours: 6
    },
    {
      protocol: 'BENEF-2026-3390',
      employeeName: 'Beatriz Albuquerque',
      employeeId: '62019',
      workplace: 'Sede Administrativa Paulista',
      benefitType: 'AMBOS',
      priority: 'MEDIA',
      status: 'AGUARDANDO_FORNECEDOR',
      description: 'Fui admitida há 2 semanas e ainda não recebi os cartões físicos de VR (Alelo) nem VT (Bilhete Único). Já abri chamado com o posto de trabalho e disseram para ver com benefícios.',
      summary: 'Nova admissão sem recebimento dos cartões físicos de VR e VT.',
      missingInfo: null,
      slaHours: 24
    },
    {
      protocol: 'BENEF-2026-4011',
      employeeName: 'Rafael Gomes Pereira',
      employeeId: '91004',
      workplace: 'Filial Campinas Taquaral',
      benefitType: 'VR',
      priority: 'MEDIA',
      status: 'EM_TRATATIVA',
      description: 'Houve desconto indevido de R$ 150 na folha referente a coparticipação de VR que não foi depositado.',
      summary: 'Desconto indevido em folha referente a VR sem crédito em cartão.',
      missingInfo: null,
      slaHours: 24
    },
    {
      protocol: 'BENEF-2026-5277',
      employeeName: 'Camila Fernandes Lima',
      employeeId: '54201',
      workplace: 'CD Cajamar',
      benefitType: 'VT',
      priority: 'BAIXA',
      status: 'RESOLVIDO',
      description: 'Gostaria de solicitar alteração do trajeto de VT por mudança de endereço residencial.',
      summary: 'Solicitação de recálculo de rota de VT devido a mudança de endereço.',
      missingInfo: null,
      slaHours: 48
    }
  ];

  for (const s of samples) {
    const { dueDate } = calculateSlaDueDate(s.priority, s.slaHours);
    const resolvedAt = s.status === 'RESOLVIDO' ? new Date(Date.now() - 3600000 * 5) : null;

    await prisma.ticket.create({
      data: {
        protocol: s.protocol,
        employeeName: s.employeeName,
        employeeId: s.employeeId,
        workplace: s.workplace,
        benefitType: s.benefitType,
        priority: s.priority,
        status: s.status,
        description: s.description,
        summary: s.summary,
        missingInfo: s.missingInfo,
        slaHours: s.slaHours,
        slaDueAt: dueDate,
        resolvedAt: resolvedAt,
        slaStatus: s.status === 'RESOLVIDO' ? 'CUMPRIDO' : 'DENTRO_PRAZO',
        treatments: {
          create: [
            {
              author: 'Sistema (IA Telegram)',
              action: 'ABERTURA_CHAMADO',
              notes: 'Chamado captado pelo bot de atendimento Telegram.'
            },
            ...(s.status !== 'NOVO' ? [{
              author: 'Juliana RH',
              action: 'MUDANCA_STATUS',
              notes: `Chamado movido para ${s.status}. Notificado fornecedor da operadora.`
            }] : [])
          ]
        }
      }
    });
  }

  console.log('Seed concluído com sucesso!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
