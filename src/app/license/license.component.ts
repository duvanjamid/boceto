/**
 * Boceto — License page
 * Copyright (c) 2024 Duvan Jamid
 * AGPL-3.0-or-later | Commercial License: duvanjamid.work@gmail.com
 */
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BacetoLogoComponent } from '../boceto-logo.component';
import { ShellThemeService } from '../shell-theme.service';

@Component({
  selector: 'app-license',
  standalone: true,
  imports: [RouterLink, BacetoLogoComponent],
  templateUrl: './license.component.html',
  styleUrls: ['./license.component.css'],
})
export class LicenseComponent {
  constructor(readonly theme: ShellThemeService) {}

  readonly plans = [
    {
      id: 'community',
      name: 'Community',
      price: 'Gratis',
      period: 'para siempre',
      badge: null,
      cta: 'Descargar',
      ctaHref: 'https://github.com/duvanjamid/boceto',
      features: [
        'Uso personal ilimitado',
        'Proyectos open source',
        'Todas las funciones del editor',
        'Todos los temas',
        'Export SVG',
        'Plugins (Prism, Docsify, VSCode)',
        'Publicar modificaciones (AGPL)',
      ],
      excluded: [
        'Productos SaaS cerrados',
        'Uso comercial privado',
        'White-label',
      ],
    },
    {
      id: 'startup',
      name: 'Startup',
      price: '$99',
      period: '/ año',
      badge: 'Popular',
      cta: 'Obtener licencia',
      ctaHref: 'mailto:duvanjamid.work@gmail.com?subject=Boceto%20Commercial%20License%20%E2%80%94%20Startup',
      features: [
        'Todo lo de Community',
        'Uso comercial privado',
        'Sin obligación AGPL',
        'Integración en productos SaaS',
        'Soporte por email',
        'Hasta $1M ARR',
      ],
      excluded: [],
    },
    {
      id: 'business',
      name: 'Business',
      price: '$499',
      period: '/ año',
      badge: null,
      cta: 'Obtener licencia',
      ctaHref: 'mailto:duvanjamid.work@gmail.com?subject=Boceto%20Commercial%20License%20%E2%80%94%20Business',
      features: [
        'Todo lo de Startup',
        'White-label (sin branding)',
        'Distribución en productos',
        'Múltiples proyectos / equipos',
        'Sin límite de ARR',
        'Soporte prioritario',
      ],
      excluded: [],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      badge: null,
      cta: 'Contactar',
      ctaHref: 'mailto:duvanjamid.work@gmail.com?subject=Boceto%20Enterprise',
      features: [
        'Todo lo de Business',
        'Contrato personalizado',
        'SLA garantizado',
        'Integraciones a medida',
        'Factura y NDA disponibles',
      ],
      excluded: [],
    },
  ];

  readonly faq = [
    {
      q: '¿Cuándo necesito una licencia comercial?',
      a: 'Si integras Boceto en un producto de pago, herramienta interna privada o SaaS sin publicar tu código fuente, necesitas la licencia comercial.',
    },
    {
      q: '¿Puedo usar Boceto gratis en mi empresa?',
      a: 'Sí, si tu empresa usa Boceto internamente y publica las modificaciones bajo AGPL. Si no quieres publicar el código, necesitas licencia comercial.',
    },
    {
      q: '¿Qué es AGPL y por qué importa?',
      a: 'AGPL obliga a publicar el código fuente de cualquier producto que use Boceto, incluyendo servicios web (SaaS). Es más restrictiva que MIT o Apache para uso comercial.',
    },
    {
      q: '¿La licencia cubre versiones futuras?',
      a: 'La licencia anual cubre todas las versiones lanzadas durante el período pagado.',
    },
    {
      q: '¿Puedo redistribuir Boceto con mi producto?',
      a: 'Con la licencia Business o Enterprise sí, como parte de un producto mayor. No puedes vender Boceto como producto standalone.',
    },
  ];
}
